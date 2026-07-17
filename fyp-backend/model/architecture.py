import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
import timm


class CNNEncoder(nn.Module):
    def __init__(self, in_channels=4, embed_dim=128):
        super().__init__()
        resnet   = models.resnet18(weights=None)
        old_conv = resnet.conv1
        new_conv = nn.Conv2d(in_channels, 64, kernel_size=7,
                             stride=2, padding=3, bias=False)
        with torch.no_grad():
            mean_w = old_conv.weight.mean(dim=1, keepdim=True)
            new_conv.weight = nn.Parameter(
                mean_w.repeat(1, in_channels, 1, 1)
            )
        resnet.conv1  = new_conv
        self.backbone = nn.Sequential(*list(resnet.children())[:-1])
        self.projector = nn.Sequential(
            nn.Flatten(),
            nn.Linear(512, embed_dim),
            nn.BatchNorm1d(embed_dim),
            nn.ReLU()
        )

    def forward(self, x):
        return self.projector(self.backbone(x))


class ViTEncoder(nn.Module):
    def __init__(self, in_channels=4, embed_dim=128):
        super().__init__()
        self.vit = timm.create_model(
            'vit_tiny_patch16_224',
            pretrained=False,
            num_classes=0,
            in_chans=in_channels
        )
        self.projector = nn.Sequential(
            nn.Linear(self.vit.embed_dim, embed_dim),
            nn.BatchNorm1d(embed_dim),
            nn.ReLU()
        )

    def forward(self, x):
        x = F.interpolate(x, size=(224, 224),
                          mode='bilinear', align_corners=False)
        return self.projector(self.vit(x))


class GenomicEncoder(nn.Module):
    def __init__(self, input_dim=4, embed_dim=128, dropout=0.3):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 32),
            nn.BatchNorm1d(32), nn.ReLU(), nn.Dropout(dropout),
            nn.Linear(32, 64),
            nn.BatchNorm1d(64), nn.ReLU(), nn.Dropout(dropout),
            nn.Linear(64, embed_dim),
            nn.BatchNorm1d(embed_dim), nn.ReLU()
        )

    def forward(self, x):
        return self.encoder(x)


class CGMAFFusion(nn.Module):
    def __init__(self, embed_dim=128):
        super().__init__()
        self.gate_cnn = nn.Sequential(
            nn.Linear(embed_dim, embed_dim), nn.Sigmoid()
        )
        self.gate_vit = nn.Sequential(
            nn.Linear(embed_dim, embed_dim), nn.Sigmoid()
        )
        self.fusion_proj = nn.Sequential(
            nn.Linear(embed_dim * 3, embed_dim * 2),
            nn.BatchNorm1d(embed_dim * 2), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(embed_dim * 2, embed_dim),
            nn.BatchNorm1d(embed_dim), nn.ReLU()
        )

    def forward(self, f_cnn, f_vit, f_genomic):
        alpha_cnn = self.gate_cnn(f_genomic)
        alpha_vit = self.gate_vit(f_genomic)
        fused_cat = torch.cat(
            [f_cnn * alpha_cnn, f_vit * alpha_vit, f_genomic], dim=1
        )
        return self.fusion_proj(fused_cat), alpha_cnn, alpha_vit


class PrototypeLayer(nn.Module):
    def __init__(self, num_classes=3, num_prototypes=5, embed_dim=128):
        super().__init__()
        self.num_classes    = num_classes
        self.num_prototypes = num_prototypes
        self.prototypes     = nn.Parameter(
            F.normalize(
                torch.randn(num_classes * num_prototypes, embed_dim), dim=1
            )
        )
        proto_labels = torch.arange(num_classes).repeat_interleave(num_prototypes)
        self.register_buffer('proto_labels', proto_labels)

    def forward(self, f_fused):
        f_norm     = F.normalize(f_fused, dim=1)
        proto_norm = F.normalize(self.prototypes, dim=1)
        sims       = torch.mm(f_norm, proto_norm.T)
        logits     = []
        for c in range(self.num_classes):
            mask = (self.proto_labels == c)
            logits.append(sims[:, mask].max(dim=1).values)
        logits        = torch.stack(logits, dim=1)
        nearest_proto = sims.argmax(dim=1)
        nearest_class = self.proto_labels[nearest_proto]
        return logits, sims, nearest_proto, nearest_class


class GliomaXAIModel(nn.Module):
    def __init__(self, mri_channels=4, genomic_dim=4,
                 embed_dim=128, num_classes=3,
                 num_prototypes=5, mc_dropout_rate=0.4):
        super().__init__()
        self.cnn_encoder     = CNNEncoder(mri_channels, embed_dim)
        self.vit_encoder     = ViTEncoder(mri_channels, embed_dim)
        self.genomic_encoder = GenomicEncoder(genomic_dim, embed_dim)
        self.fusion          = CGMAFFusion(embed_dim)
        self.mc_dropout      = nn.Dropout(mc_dropout_rate)
        self.prototype_layer = PrototypeLayer(
            num_classes, num_prototypes, embed_dim
        )

    def forward(self, mri, genomic):
        f_cnn     = self.cnn_encoder(mri)
        f_vit     = self.vit_encoder(mri)
        f_genomic = self.genomic_encoder(genomic)
        f_fused, gate_cnn, gate_vit = self.fusion(f_cnn, f_vit, f_genomic)
        f_dropped = self.mc_dropout(f_fused)
        logits, sims, near_p, near_c = self.prototype_layer(f_dropped)
        return {
            'logits'       : logits,
            'similarities' : sims,
            'nearest_proto': near_p,
            'nearest_class': near_c,
            'gate_cnn'     : gate_cnn,
            'gate_vit'     : gate_vit,
            'f_fused'      : f_fused
        }