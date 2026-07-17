from fastapi import APIRouter
import torch

router = APIRouter()

@router.get('/health')
def health_check():
    return {
        'status' : 'ok',
        'model'  : 'GliomaXAI — CG-MAF + Prototype',
        'device' : 'cuda' if torch.cuda.is_available() else 'cpu',
        'version': '1.0.0'
    }