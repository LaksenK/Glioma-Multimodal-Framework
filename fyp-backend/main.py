import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from model.predictor import GliomaPredictor
from routers import health, predict as predict_router

# ── Paths ─────────────────────────────────────────────────
MODEL_PATH  = os.path.join('models', 'best_model.pt')
CONFIG_PATH = os.path.join('models', 'project_config.json')


# ── Startup / shutdown ────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load model once at startup
    print('[Startup] Loading GliomaXAI model...')
    predictor = GliomaPredictor(
        model_path  = MODEL_PATH,
        config_path = CONFIG_PATH
    )
    predict_router.set_predictor(predictor)
    print('[Startup] Model ready ✅')
    yield
    print('[Shutdown] Cleaning up...')


# ── App ───────────────────────────────────────────────────
app = FastAPI(
    title       = 'GliomaXAI API',
    description = (
        'CG-MAF + Prototype Learning — Glioma Stratification '
        'Research Prototype. FYP CB011675.'
    ),
    version  = '1.0.0',
    lifespan = lifespan,
    docs_url = '/docs',
)

# ── CORS — allow Next.js frontend ─────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ['http://localhost:3000'],
    allow_credentials = True,
    allow_methods     = ['*'],
    allow_headers     = ['*'],
)

# ── Routers ───────────────────────────────────────────────
app.include_router(health.router,         tags=['Health'])
app.include_router(predict_router.router, tags=['Prediction'],
                   prefix='/api')

@app.get('/')
def root():
    return {
        'message': 'GliomaXAI API is running',
        'docs'   : '/docs',
        'health' : '/health',
        'predict': '/api/predict',
        'demo'   : '/api/demo/{patient_id}'
    }