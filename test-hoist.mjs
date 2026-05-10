import { PDFParse } from "pdf-parse";
if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {};
}
const buffer = Buffer.from("%PDF-1.4\n1 0 obj\n<<\n/Title (Dummy PDF)\n>>\nendobj\n%EOF");
try {
  const parser = new PDFParse({ data: buffer });
  await parser.getText();
  console.log("Success");
} catch (e) {
  console.error("Error:", e.message);
}
