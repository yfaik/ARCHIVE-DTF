import { z } from 'zod';

export const loginSchema = z.object({
  login: z.string().min(2, 'Le nom d utilisateur est requis'),
  password: z.string().min(4, 'Le mot de passe est requis')
});

export const userCreateSchema = z.object({
  login: z.string().min(3, 'Le login doit contenir au moins 3 caractères'),
  name: z.string().min(2, 'Le nom complet est requis'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  role: z.enum(['CHEF_DIVISION', 'SECRETAIRE', 'RESPONSABLE_BO', 'USER_SERVICE']),
  service: z.enum(['Service Technique', 'Service Financier', 'Service Comptabilité', 'Chef de Division']).nullable().optional()
});

export const userUpdateSchema = z.object({
  name: z.string().min(2, 'Le nom complet est requis').optional(),
  role: z.enum(['CHEF_DIVISION', 'SECRETAIRE', 'RESPONSABLE_BO', 'USER_SERVICE']).optional(),
  service: z.enum(['Service Technique', 'Service Financier', 'Service Comptabilité', 'Chef de Division']).nullable().optional(),
  active: z.boolean().optional()
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères')
});

export const courrierArriveSchema = z.object({
  reference: z.string().min(2, 'La référence est obligatoire et doit être saisie manuellement'),
  objet: z.string().min(3, 'L objet du courrier est obligatoire'),
  expediteur: z.string().min(2, 'L expéditeur est obligatoire'),
  date_arrivee: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),
  observation: z.string().optional().nullable(),
  service_destinataire: z.enum(['Service Technique', 'Service Financier', 'Service Comptabilité', 'Chef de Division']),
  priorite: z.enum(['Normal', 'Urgent', 'Très Urgent']).optional().default('Normal')
});

export const courrierDepartSchema = z.object({
  reference: z.string().min(2, 'La référence est obligatoire et doit être saisie manuellement'),
  objet: z.string().min(3, 'L objet du courrier est obligatoire'),
  destinataire: z.string().min(2, 'Le destinataire est obligatoire'),
  date_depart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),
  observation: z.string().optional().nullable()
});

export const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Erreur de validation des données', 
        details: err.errors.map(e => e.message) 
      });
    }
    next(err);
  }
};
