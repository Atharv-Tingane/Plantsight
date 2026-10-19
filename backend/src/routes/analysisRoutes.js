import { Router } from 'express';
import { listAnalyses, runAnalysis } from '../controllers/analysisController.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', listAnalyses);
router.post('/analyze', upload.single('imageFile'), runAnalysis);

export default router;
