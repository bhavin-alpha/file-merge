import "./styles.css";
import React, { useState } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import Papa from "papaparse";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";

export default function App() {
  const [pdfUrl, setPdfUrl] = useState(null);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    const finalPdf = await PDFDocument.create();

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();

      if (file.type === "application/pdf") {
        const loadedPdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await finalPdf.copyPages(
          loadedPdf,
          loadedPdf.getPageIndices()
        );
        copiedPages.forEach((page) => finalPdf.addPage(page));
      } else if (file.type === "image/png" || file.type === "image/jpeg") {
        let image;
        if (file.type === "image/png") {
          image = await finalPdf.embedPng(arrayBuffer);
        } else {
          image = await finalPdf.embedJpg(arrayBuffer);
        }
        const page = finalPdf.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      } else if (file.type === "text/csv") {
        const text = await file.text();
        const data = Papa.parse(text).data;
        const page = finalPdf.addPage([600, 800]);
        const font = await finalPdf.embedFont(StandardFonts.Helvetica);
        let y = 750;
        for (const row of data) {
          const rowText = row.join(" | ");
          page.drawText(rowText, {
            x: 50,
            y,
            size: 12,
            font,
            color: rgb(0, 0, 0),
          });
          y -= 20;
        }
      } else if (file.name.endsWith(".docx")) {
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const text = result.value.replace(/<[^>]*>?/gm, ""); // strip html tags
        const page = finalPdf.addPage([600, 800]);
        const font = await finalPdf.embedFont(StandardFonts.Helvetica);
        const paragraphs = text.split("\n");
        let y = 750;
        for (const para of paragraphs) {
          page.drawText(para.trim(), {
            x: 50,
            y,
            size: 12,
            font,
            color: rgb(0, 0, 0),
          });
          y -= 20;
          if (y < 50) {
            y = 750;
            finalPdf.addPage();
          }
        }
      } else if (file.name.endsWith(".xlsx")) {
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          header: 1,
        });

        const page = finalPdf.addPage([600, 800]);
        const font = await finalPdf.embedFont(StandardFonts.Helvetica);
        let y = 750;
        for (const row of sheet) {
          const rowText = row.join(" | ");
          page.drawText(rowText, {
            x: 50,
            y,
            size: 12,
            font,
            color: rgb(0, 0, 0),
          });
          y -= 20;
          if (y < 50) {
            y = 750;
            finalPdf.addPage();
          }
        }
      }
    }

    const mergedBytes = await finalPdf.save();
    const blob = new Blob([mergedBytes], { type: "application/pdf" });
    setPdfUrl(URL.createObjectURL(blob));
  };
  return (
    <div>
      <input
        type="file"
        multiple
        onChange={handleFiles}
        accept=".pdf,.csv,.docx,.xlsx,image/png,image/jpeg"
      />
      {pdfUrl && (
        <a href={pdfUrl} download="merged.pdf">
          Download Combined PDF
        </a>
      )}
    </div>
  );
}
