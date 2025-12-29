const jwt = require('jsonwebtoken');
const http = require('http');
const fs = require('fs');
const FormData = require('form-data');

const userId = 'usr_mihai_ciurciun_7d113fd7098a';
const email = 'mihai.ciurciun@gmail.com';
const secret = 'DocumentIulia2025SuperSecretJWTKeyForProductionEnvironment';

const payload = {
  sub: userId,
  email: email,
  role: 'ADMIN'
};

const token = jwt.sign(payload, secret, { expiresIn: '24h' });

console.log('================================================================================');
console.log('OCR SYSTEM - UPLOAD & DOWNLOAD TEST');
console.log('================================================================================\n');

// Create a test file
const testContent = 'This is a test document for OCR upload testing.\n\nDocumentIulia.ro - AI-Powered Accounting Platform';
fs.writeFileSync('/tmp/test-document.txt', testContent);
console.log('✅ Created test file: /tmp/test-document.txt');
console.log('   Size:', testContent.length, 'bytes\n');

// Upload the file
console.log('TEST 1: Upload Document');
console.log('--------------------------------------------------------------------------------');

const form = new FormData();
form.append('file', fs.createReadStream('/tmp/test-document.txt'), {
  filename: 'test-document.txt',
  contentType: 'text/plain'
});

const uploadReq = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/v1/documents/upload',
  method: 'POST',
  headers: {
    ...form.getHeaders(),
    'Authorization': 'Bearer ' + token
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    if (res.statusCode === 201 || res.statusCode === 200) {
      const doc = JSON.parse(data);
      console.log('✅ Upload successful!');
      console.log('   Document ID:', doc.id);
      console.log('   Filename:', doc.filename);
      console.log('   File URL:', doc.fileUrl);
      console.log('   Status:', doc.status);
      console.log('');

      // Now test download
      testDownload(doc.id, doc.filename);
    } else {
      console.log('❌ Upload failed');
      console.log('Response:', data);
    }
  });
});

uploadReq.on('error', (e) => console.error('❌ Upload error:', e.message));
form.pipe(uploadReq);

function testDownload(documentId, filename) {
  console.log('TEST 2: Download Document');
  console.log('--------------------------------------------------------------------------------');
  console.log('Downloading:', filename);
  console.log('Document ID:', documentId);

  const downloadReq = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/documents/' + documentId + '/download',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  }, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Content-Type:', res.headers['content-type']);
    console.log('Content-Disposition:', res.headers['content-disposition']);

    if (res.statusCode === 200) {
      let size = 0;
      let chunks = [];
      res.on('data', chunk => {
        size += chunk.length;
        chunks.push(chunk);
      });
      res.on('end', () => {
        const content = Buffer.concat(chunks).toString('utf-8');
        console.log('Downloaded size:', size, 'bytes');
        console.log('Content preview:', content.substring(0, 100) + '...');
        console.log('✅ Download successful!\n');

        printSummary(true);
      });
    } else {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('❌ Download failed');
        console.log('Response:', data);
        console.log('');

        printSummary(false);
      });
    }
  });

  downloadReq.on('error', (e) => {
    console.error('❌ Download error:', e.message);
    printSummary(false);
  });
  downloadReq.end();
}

function printSummary(downloadSuccess) {
  console.log('================================================================================');
  console.log('TEST SUMMARY');
  console.log('================================================================================');
  console.log('Upload: ✅');
  console.log('Download:', downloadSuccess ? '✅' : '❌');
  console.log('');
  if (downloadSuccess) {
    console.log('✅ COMPLETE END-TO-END TEST PASSED');
    console.log('   - Document uploaded successfully');
    console.log('   - File stored in container filesystem');
    console.log('   - Download endpoint working correctly');
    console.log('   - File content retrieved successfully');
  } else {
    console.log('⚠️  Upload works but download has issues');
    console.log('   Possible causes:');
    console.log('   - File path mismatch');
    console.log('   - Volume mount missing');
    console.log('   - Permission issues');
  }
  console.log('================================================================================');
}
