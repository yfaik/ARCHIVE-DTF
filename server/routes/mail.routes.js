import { Router } from 'express';
import { 
  getCourriersArrives, 
  getMyCourriersChef,
  createCourrierArrive, 
  updateCourrierArrive,
  updateCourrierArriveStatus,
  getCourriersDeparts,
  createCourrierDepart,
  updateCourrierDepart,
  downloadPdf,
  getSearchSuggestions
} from '../controllers/mail.controller.js';
import { authenticateToken, authorizeRoles, enforceServiceAccess } from '../middleware/auth.js';
import { uploadPdf } from '../middleware/upload.js';
import { validateBody, courrierArriveSchema, courrierDepartSchema } from '../middleware/validate.js';

const router = Router();

router.use(authenticateToken);

// Search Suggestions
router.get('/search/suggestions', getSearchSuggestions);

// Dedicated endpoint for Chef de Division's assigned courriers
router.get('/my-courriers', authorizeRoles('CHEF_DIVISION'), getMyCourriersChef);

// Courriers Arrivés
router.get('/arrives', enforceServiceAccess, getCourriersArrives);
router.post('/arrives', authorizeRoles('CHEF_DIVISION', 'RESPONSABLE_BO', 'SECRETAIRE'), uploadPdf.single('pdf'), createCourrierArrive);
router.put('/arrives/:id', authorizeRoles('CHEF_DIVISION', 'RESPONSABLE_BO', 'SECRETAIRE'), uploadPdf.single('pdf'), updateCourrierArrive);
router.put('/arrives/:id/status', authorizeRoles('CHEF_DIVISION', 'USER_SERVICE'), updateCourrierArriveStatus);
router.patch('/arrives/:id/status', authorizeRoles('CHEF_DIVISION', 'USER_SERVICE'), updateCourrierArriveStatus);
router.patch('/courriers/:id/statut', authorizeRoles('CHEF_DIVISION', 'USER_SERVICE'), updateCourrierArriveStatus);
router.put('/courriers/:id/statut', authorizeRoles('CHEF_DIVISION', 'USER_SERVICE'), updateCourrierArriveStatus);

// Courriers Départ
router.get('/departs', enforceServiceAccess, getCourriersDeparts);
router.post('/departs', authorizeRoles('CHEF_DIVISION', 'RESPONSABLE_BO', 'SECRETAIRE'), uploadPdf.single('pdf'), createCourrierDepart);
router.put('/departs/:id', authorizeRoles('CHEF_DIVISION', 'RESPONSABLE_BO', 'SECRETAIRE'), uploadPdf.single('pdf'), updateCourrierDepart);

// PDF Streaming & Download with Role Isolation Check
router.get('/pdf/:type/:filename', downloadPdf);
router.get('/pdf/:filename', downloadPdf);

export default router;
