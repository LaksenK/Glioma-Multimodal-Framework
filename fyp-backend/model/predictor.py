import os
import json
import numpy as np
import torch
import torch.nn.functional as F
import nibabel as nib
from model.architecture import GliomaXAIModel

CLASS_NAMES = ['glioblastoma', 'astrocytoma', 'oligodendroglioma']

CLINICAL_NOTES = {
    'glioblastoma': (
        'WHO Grade IV. Most aggressive adult brain tumor. '
        'IDH-wildtype. Median survival 12-18 months. '
        'Characterized by necrotic core and ring enhancement on T1CE.'
    ),
    'astrocytoma': (
        'WHO Grade II-III. IDH-mutant diffuse glioma. '
        'Better prognosis than GBM. '
        'Diffuse infiltration without ring enhancement.'
    ),
    'oligodendroglioma': (
        'WHO Grade II-III. IDH-mutant and 1p/19q codeleted. '
        'Best prognosis among diffuse gliomas. '
        'Often shows calcification and cortical involvement.'
    )
}


class GliomaPredictor:
    """
    Loads trained model once at startup.
    Handles all preprocessing and inference.
    """

    def __init__(self, model_path: str, config_path: str):
        self.device = torch.device(
            'cuda' if torch.cuda.is_available() else 'cpu'
        )
        print(f"[Predictor] Using device: {self.device}")

        # Load config
        with open(config_path, 'r') as f:
            self.cfg = json.load(f)

        # Load model
        self.model = GliomaXAIModel(
            mri_channels    = self.cfg['MRI_CHANNELS'],
            genomic_dim     = self.cfg['GENOMIC_DIM'],
            embed_dim       = self.cfg['EMBED_DIM'],
            num_classes     = self.cfg['NUM_CLASSES'],
            num_prototypes  = self.cfg['NUM_PROTOTYPES'],
            mc_dropout_rate = 0.4
        ).to(self.device)

        # FIX: Explicitly added weights_only=False to allow numpy types embedded inside the dict checkpoint
        ckpt = torch.load(model_path, map_location=self.device, weights_only=False)
        self.model.load_state_dict(ckpt['model_state_dict'])
        print(f"[Predictor] Model loaded from epoch {ckpt['epoch']}")

    # ── Preprocessing ─────────────────────────────────────
    def _load_nifti(self, path: str) -> np.ndarray:
        return nib.load(path).get_fdata(dtype=np.float32)

    def _normalize(self, vol: np.ndarray,
                    brain_mask: np.ndarray) -> np.ndarray:
        mean = vol[brain_mask].mean()
        std  = vol[brain_mask].std()
        std  = std if std > 1e-8 else 1.0
        norm = np.zeros_like(vol)
        norm[brain_mask] = (vol[brain_mask] - mean) / std
        return norm

    def preprocess(self, t1_path: str, t1ce_path: str,
                   t2_path: str, flair_path: str,
                   slice_idx: int = 77) -> torch.Tensor:
        """
        Load 4 NIfTI files → normalized 2.5D tensor (1, 4, 240, 240)
        """
        t1    = self._load_nifti(t1_path)
        t1ce  = self._load_nifti(t1ce_path)
        t2    = self._load_nifti(t2_path)
        flair = self._load_nifti(flair_path)

        brain_mask = flair > 0
        vols       = [t1, t1ce, t2, flair]
        normalized = [self._normalize(v, brain_mask) for v in vols]

        # Extract central axial slice
        slices = np.stack(
            [v[:, :, slice_idx] for v in normalized], axis=0
        )  # (4, 240, 240)

        return torch.from_numpy(
            slices.astype(np.float32)
        ).unsqueeze(0).to(self.device)

    def _build_genomic_vector(self,
                               idh: float = 0.0,
                               codel: float = 0.0,
                               mgmt: float = 0.0,
                               mgmt_available: float = 0.0
                               ) -> torch.Tensor:
        vec = np.array(
            [idh, codel, mgmt, mgmt_available], dtype=np.float32
        )
        return torch.from_numpy(vec).unsqueeze(0).to(self.device)

    # ── Inference ─────────────────────────────────────────
    def predict(self,
                t1_path: str, t1ce_path: str,
                t2_path: str, flair_path: str,
                idh: float = 0.0,
                codel: float = 0.0,
                mgmt: float = 0.0,
                mgmt_available: float = 0.0,
                n_mc_passes: int = 50) -> dict:
        """
        Full inference pipeline.
        Returns structured prediction + explanation dict.
        """
        mri_tensor = self.preprocess(t1_path, t1ce_path, t2_path, flair_path)
        gen_tensor = self._build_genomic_vector(idh, codel, mgmt, mgmt_available)

        # MC Dropout — keep dropout active during inference
        self.model.train()
        all_probs = []

        with torch.no_grad():
            for _ in range(n_mc_passes):
                out   = self.model(mri_tensor, gen_tensor)
                probs = F.softmax(out['logits'], dim=1).cpu().numpy()[0]
                all_probs.append(probs)

        self.model.eval()

        all_probs   = np.array(all_probs)       # (50, 3)
        mean_probs  = all_probs.mean(axis=0)    # (3,)
        std_probs   = all_probs.std(axis=0)     # (3,)

        pred_class  = int(mean_probs.argmax())
        confidence  = float(mean_probs[pred_class])
        uncertainty = float(std_probs[pred_class])
        uncertain   = uncertainty > 0.15

        # Get prototype info from single deterministic pass
        self.model.eval()
        with torch.no_grad():
            out = self.model(mri_tensor, gen_tensor)

        nearest_proto_global = int(out['nearest_proto'].item())
        nearest_class_idx    = int(out['nearest_class'].item())
        proto_within_class   = nearest_proto_global % self.cfg['NUM_PROTOTYPES']
        sim_score            = float(
            out['similarities'][0, nearest_proto_global].item()
        )

        predicted_class = CLASS_NAMES[pred_class]
        nearest_class   = CLASS_NAMES[nearest_class_idx]

        conf_level = ('HIGH'     if confidence > 0.80
                      else 'MODERATE' if confidence > 0.60
                      else 'LOW')

        return {
            'predicted_class'  : predicted_class,
            'confidence'       : round(confidence, 4),
            'uncertainty'      : round(uncertainty, 4),
            'uncertain_flag'   : uncertain,
            'confidence_level' : conf_level,
            'nearest_proto'    : proto_within_class + 1,
            'nearest_class'    : nearest_class,
            'similarity_score' : round(sim_score, 4),
            'mean_probs'       : mean_probs.tolist(),
            'std_probs'        : std_probs.tolist(),
            'clinical_note'    : CLINICAL_NOTES.get(predicted_class, ''),
        }