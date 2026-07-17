import os
import shutil
import uuid
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from model.predictor import GliomaPredictor
from model.explainer import generate_report

router    = APIRouter()
predictor = None   # set at startup in main.py

UPLOAD_DIR = 'uploads'
os.makedirs(UPLOAD_DIR, exist_ok=True)


def set_predictor(p: GliomaPredictor):
    global predictor
    predictor = p


async def save_upload(file: UploadFile, dest: str):
    with open(dest, 'wb') as f:
        shutil.copyfileobj(file.file, f)


@router.post('/predict')
async def predict(
    t1_file   : UploadFile = File(..., description='T1 NIfTI file'),
    t1ce_file : UploadFile = File(..., description='T1CE NIfTI file'),
    t2_file   : UploadFile = File(..., description='T2 NIfTI file'),
    flair_file: UploadFile = File(..., description='FLAIR NIfTI file'),
    patient_id: str  = Form(default='UNKNOWN'),
    idh       : float = Form(default=0.0),
    codel     : float = Form(default=0.0),
    mgmt      : float = Form(default=0.0),
    mgmt_avail: float = Form(default=0.0),
):
    """
    Main prediction endpoint.
    Accepts 4 NIfTI files + optional molecular markers.
    Returns prediction + prototype explanation + report.
    """
    if predictor is None:
        raise HTTPException(status_code=503,
                            detail='Model not loaded yet')

    # Save uploaded files to temp directory
    session_id = str(uuid.uuid4())[:8]
    session_dir = os.path.join(UPLOAD_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)

    t1_path    = os.path.join(session_dir, 't1.nii.gz')
    t1ce_path  = os.path.join(session_dir, 't1ce.nii.gz')
    t2_path    = os.path.join(session_dir, 't2.nii.gz')
    flair_path = os.path.join(session_dir, 'flair.nii.gz')

    try:
        await save_upload(t1_file,    t1_path)
        await save_upload(t1ce_file,  t1ce_path)
        await save_upload(t2_file,    t2_path)
        await save_upload(flair_file, flair_path)

        # Run inference
        prediction = predictor.predict(
            t1_path    = t1_path,
            t1ce_path  = t1ce_path,
            t2_path    = t2_path,
            flair_path = flair_path,
            idh        = idh,
            codel      = codel,
            mgmt       = mgmt,
            mgmt_available = mgmt_avail,
        )

        # Generate natural language report
        report = generate_report(
            prediction   = prediction,
            patient_id   = patient_id,
            idh_status   = ('IDH-mutant'   if idh   == 1.0
                            else 'IDH-wildtype'),
            codel_status = ('1p/19q codeleted' if codel == 1.0
                            else 'Non-codeleted'),
            mgmt_status  = ('MGMT methylated'   if mgmt  == 1.0
                            else 'MGMT unmethylated'
                            if mgmt_avail == 1.0
                            else 'MGMT status unknown'),
        )

        return JSONResponse({
            'status'     : 'success',
            'patient_id' : patient_id,
            'prediction' : prediction,
            'report'     : report,
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Clean up uploaded files
        shutil.rmtree(session_dir, ignore_errors=True)


@router.get('/demo/{patient_id}')
async def demo_prediction(patient_id: str):
    """
    Demo endpoint — returns pre-computed explanation
    for a test patient without needing file uploads.
    Used by the frontend demo mode.
    """
    import json
    try:
        with open('models/test_explanations.json', 'r') as f:
            explanations = json.load(f)

        match = next(
            (e for e in explanations
             if e['patient_id'] == patient_id), None
        )

        if not match:
            raise HTTPException(
                status_code=404,
                detail=f'Patient {patient_id} not found'
            )

        report = generate_report(
            prediction={
                'predicted_class' : match['predicted_class'],
                'confidence'      : match['confidence'],
                'uncertainty'     : match['uncertainty'],
                'uncertain_flag'  : match['uncertain_flag'],
                'confidence_level': match['confidence_level'],
                'nearest_proto'   : match['nearest_proto'],
                'nearest_class'   : match['nearest_class'],
                'similarity_score': match['similarity_score'],
                'mean_probs'      : match['mean_probs'],
                'std_probs'       : match['std_probs'],
                'clinical_note'   : '',
            },
            patient_id   = patient_id,
            idh_status   = match.get('idh_status',   'Unknown'),
            codel_status = match.get('codel_status', 'Unknown'),
            mgmt_status  = match.get('mgmt_status',  'Unknown'),
        )

        return JSONResponse({
            'status'    : 'success',
            'patient_id': patient_id,
            'prediction': match,
            'report'    : report,
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))