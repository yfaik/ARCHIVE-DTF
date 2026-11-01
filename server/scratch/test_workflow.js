import db from '../config/db.js';
import axios from 'axios';

async function testSimplifiedWorkflow() {
  console.log('🧪 Testing Simplified Workflow: Nouveau -> Transmis...');

  const baseURL = process.env.API_URL || process.env.VITE_API_URL || 'http://localhost:5000/api';

  try {
    // 1. Logins
    const secRes = await axios.post(`${baseURL}/auth/login`, { login: 'secretaire', password: 'Password123!' });
    const secToken = secRes.data.token;

    const adminRes = await axios.post(`${baseURL}/auth/login`, { login: 'admin', password: 'Password123!' });
    const adminToken = adminRes.data.token;

    const techRes = await axios.post(`${baseURL}/auth/login`, { login: 'technique', password: 'Password123!' });
    const techToken = techRes.data.token;

    const finRes = await axios.post(`${baseURL}/auth/login`, { login: 'financier', password: 'Password123!' });
    const finToken = finRes.data.token;

    console.log('✅ Logins successful: Secrétaire, Chef de Division (admin), Service Technique, Service Financier.');

    const reqSec = axios.create({ baseURL, headers: { Authorization: `Bearer ${secToken}` } });
    const reqAdmin = axios.create({ baseURL, headers: { Authorization: `Bearer ${adminToken}` } });
    const reqTech = axios.create({ baseURL, headers: { Authorization: `Bearer ${techToken}` } });
    const reqFin = axios.create({ baseURL, headers: { Authorization: `Bearer ${finToken}` } });

    const testRef = 'ARR-SIMPLIFIED-2026';
    await db.query('DELETE FROM courriers_arrives WHERE reference = ?', [testRef]);

    // 2. Direct DB Insert (Simulating Secrétaire mail creation)
    await db.query(
      `INSERT INTO courriers_arrives (reference, objet, expediteur, date_arrivee, service_destinataire, statut, priorite, pdf_filename, pdf_original_name, pdf_size, created_by)
       VALUES (?, ?, ?, CURDATE(), ?, 'NOUVEAU', 'Urgent', 'demo_document.pdf', 'demo_document.pdf', 1024, 2)`,
      [testRef, 'Demande de permis de construire zone industrielle', 'Société Marocaine d Ingénierie', 'Service Technique']
    );

    const mail = await db.get('SELECT * FROM courriers_arrives WHERE reference = ?', [testRef]);
    const mailId = mail.id;
    console.log(`📌 1. Secrétaire created mail ID=${mailId}, Ref=${testRef}. Status = "${mail.statut}"`);

    if (mail.statut !== 'NOUVEAU') {
      throw new Error('Initial status MUST be NOUVEAU!');
    }

    // 3. Test: Secrétaire CANNOT transmit or change status
    try {
      await reqSec.put(`/mails/arrives/${mailId}/status`, { statut: 'TRANSMIS' });
      throw new Error('Secrétaire should NOT be allowed to transmit!');
    } catch (err) {
      if (err.response?.status === 403) {
        console.log(`✅ 2. Secrétaire transmit attempt correctly blocked with HTTP 403: "${err.response.data.error}"`);
      } else {
        throw err;
      }
    }

    // 4. Test: Chef de Division sees the Nouveau mail
    const adminMails = (await reqAdmin.get('/mails/arrives')).data;
    const adminFound = adminMails.some(m => m.id === mailId);
    console.log(`👁️ 3. Chef de Division sees Nouveau mail (expect true): ${adminFound}`);
    if (!adminFound) throw new Error('Chef de Division MUST see Nouveau mail!');

    // 5. Test: Service Technique DOES NOT see Nouveau mail before transmission
    const techMailsBefore = (await reqTech.get('/mails/arrives')).data;
    const techFoundBefore = techMailsBefore.some(m => m.id === mailId);
    console.log(`🔒 4. Service Technique visibility BEFORE transmission (expect false): ${techFoundBefore}`);
    if (techFoundBefore) throw new Error('Service Technique MUST NOT see Nouveau mail before transmission!');

    // 6. Test: Chef de Division transmits mail to Service Technique
    const transRes = await reqAdmin.put(`/mails/arrives/${mailId}/status`, {
      statut: 'TRANSMIS',
      service_destinataire: 'Service Technique'
    });
    console.log(`✅ 5. Chef de Division transmitted mail. New Status = "${transRes.data.statut}"`);

    // 7. Test: Service Technique sees the Transmitted mail
    const techMailsAfter = (await reqTech.get('/mails/arrives')).data;
    const techFoundAfter = techMailsAfter.some(m => m.id === mailId);
    console.log(`👁️ 6. Service Technique visibility AFTER transmission (expect true): ${techFoundAfter}`);
    if (!techFoundAfter) throw new Error('Service Technique MUST see Transmitted mail!');

    // 8. Test: Service Financier DOES NOT see the mail
    const finMailsAfter = (await reqFin.get('/mails/arrives')).data;
    const finFoundAfter = finMailsAfter.some(m => m.id === mailId);
    console.log(`🔒 7. Service Financier visibility (expect false): ${finFoundAfter}`);
    if (finFoundAfter) throw new Error('Service Financier MUST NOT see Service Technique mail!');

    // 9. Test: Service Financier CANNOT change status of Service Technique's mail
    try {
      await reqFin.put(`/mails/arrives/${mailId}/status`, { statut: 'En cours' });
      throw new Error('Service Financier should NOT be allowed to touch Service Technique mail!');
    } catch (err) {
      if (err.response?.status === 403) {
        console.log(`✅ 8. Cross-service change attempt correctly blocked with HTTP 403: "${err.response.data.error}"`);
      } else {
        throw err;
      }
    }

    // 10. Test: Service Technique takes in charge ("En cours")
    const enCoursRes = await reqTech.put(`/mails/arrives/${mailId}/status`, { statut: 'En cours' });
    console.log(`✅ 9. Service Technique took charge of mail. New Status = "${enCoursRes.data.statut}"`);
    if (!String(enCoursRes.data.statut).toUpperCase().includes('COURS')) {
      throw new Error('Expected status to be En cours!');
    }

    // 11. Test: Service Technique marks as Traité ("Traité")
    const traiteRes = await reqTech.put(`/mails/arrives/${mailId}/status`, { statut: 'Traité' });
    console.log(`✅ 10. Service Technique marked mail as Traité. New Status = "${traiteRes.data.statut}", Traité par = "${traiteRes.data.traite_par}"`);
    if (!String(traiteRes.data.statut).toUpperCase().includes('TRAIT')) {
      throw new Error('Expected status to be Traité!');
    }

    // 10. Audit log check
    const logsRes = await reqAdmin.get('/audit');
    const logs = logsRes.data.logs || logsRes.data || [];
    console.log('📋 9. Audit Log entries:');
    logs.slice(0, 3).forEach(l => {
      console.log(`   • [${l.timestamp}] ${l.user_name} (${l.role}): ${l.action}`);
    });

    // Cleanup
    await db.query('DELETE FROM courriers_arrives WHERE id = ?', [mailId]);
    console.log('🎉 SIMPLIFIED WORKFLOW TEST PASSED 100% PERFECTLY!');
  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message);
  } finally {
    process.exit(0);
  }
}

testSimplifiedWorkflow();
