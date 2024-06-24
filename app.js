const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/stories', express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const documentsDir = path.join(__dirname, 'documents');

// Helper functions
const updateMetadata = (folder) => {
    const folderPath = path.join(documentsDir, folder);
    const files = fs.readdirSync(folderPath).filter(f => f !== 'metadata.json');
    const metadata = {
        filelist: files.map((file, index) => ({
            name: file,
            index: index,
            bias: 1
        })),
        pointer: 0
    };
    fs.writeFileSync(path.join(folderPath, 'metadata.json'), JSON.stringify(metadata, null, 2));
};

const getMetadata = (folder) => {
    const folderPath = path.join(documentsDir, folder);
    const metadataPath = path.join(folderPath, 'metadata.json');
    return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
};

// Routes
app.get('/stories/folders', (req, res) => {
    const folders = fs.readdirSync(documentsDir).filter(f => fs.statSync(path.join(documentsDir, f)).isDirectory());
    res.render('folders', { folders });
});

app.get('/stories/documents/:folder', (req, res) => {
    const folderName = req.params.folder;
    const metadata = getMetadata(folderName);
    res.render('documents', { folder: folderName, documents: metadata.filelist });
});

app.get('/stories/stats/:folder', (req, res) => {
    const folderName = req.params.folder;
    const metadata = getMetadata(folderName);
    const accessLogPath = path.join(documentsDir, 'access_log.txt');
    const accessLog = fs.existsSync(accessLogPath) ? fs.readFileSync(accessLogPath, 'utf8').split('\n') : [];
    res.render('stats', { folder: folderName, documents: metadata.filelist, accessLog });
});

app.post('/stories/folders', (req, res) => {
    const folderName = req.body.folderName;
    const folderPath = path.join(documentsDir, folderName);
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
        fs.writeFileSync(path.join(folderPath, 'new_file.txt'), ''); // Create an empty file
        updateMetadata(folderName);
        res.status(201).redirect('/stories/folders');
    } else {
        res.status(400).send('Folder already exists');
    }
});

app.post('/stories/documents/:folder', (req, res) => {
    const folderName = req.params.folder;
    const documentName = req.body.documentName || 'new_file.txt';
    const folderPath = path.join(documentsDir, folderName);
    const filePath = path.join(folderPath, documentName);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, 'Type here');
        updateMetadata(folderName);
        res.status(201).redirect(`/stories/documents/${folderName}`);
    } else {
        res.status(400).send('Document already exists');
    }
});

app.delete('/stories/folders/:folder', (req, res) => {
    const folderName = req.params.folder;
    const folderPath = path.join(documentsDir, folderName);
    if (fs.existsSync(folderPath)) {
        fs.rmdirSync(folderPath, { recursive: true });
        res.status(200).redirect('/stories/folders');
    } else {
        res.status(404).send('Folder not found');
    }
});

app.delete('/stories/documents/:folder/:document', (req, res) => {
    const folderName = req.params.folder;
    const documentName = req.params.document;
    const folderPath = path.join(documentsDir, folderName);
    const filePath = path.join(folderPath, documentName);
    const metadata = getMetadata(folderName);

    if (metadata.filelist.length > 1) {
        fs.unlinkSync(filePath);
        updateMetadata(folderName);
        res.status(200).redirect(`/stories/documents/${folderName}`);
    } else {
        res.status(400).send('Cannot delete the last document in the folder');
    }
});

app.get('/stories/document/:folder/:document', (req, res) => {
    const folderName = req.params.folder;
    const documentName = req.params.document;
    const filePath = path.join(documentsDir, folderName, documentName);
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ title: documentName, content: content });
});

app.post('/stories/document/:folder/:document', (req, res) => {
    const folderName = req.params.folder;
    const documentName = req.params.document;
    const content = req.body.content;
    const filePath = path.join(documentsDir, folderName, documentName);
    fs.writeFileSync(filePath, content);
    res.status(200).send('Document updated');
});

// Start server
const PORT = 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
