const fs = require('fs');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

class FileService {
  static async extractText(file) {
    let text = '';

    //! ===== PDF =====
    if (file.mimetype === 'application/pdf') {
      const buffer = fs.readFileSync(file.path);
      const data = await pdfParse(buffer);
      text = data.text;
    }

    //? ===== DOCX =====
    if (
      file.mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ path: file.path });
      text = result.value;
    }

    fs.unlinkSync(file.path);

    return text;
  }
}

module.exports = FileService;