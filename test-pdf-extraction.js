// Simple test for PDF extraction functionality
// This can be run in the browser console to test PDF extraction

// Sample base64 PDF for testing (very minimal PDF)
const samplePDFBase64 = "JVBERi0xLjMKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwKL0xlbmd0aCA0NDIKL0ZpbHRlciBbL0ZsYXRlRGVjb2RlXQo+PgpzdHJlYW0KeJyrVkosLcmIzCtJTSxRslIyUKpVMjSwUNJRCsnPS85PTE7VUSrJSFXSUSpJLS5JzCvRy87MKzG0UjAyMDNVqo4FAKPeFIsKZW5kc3RyZWFtCmVuZG9iagoKNSAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDYgMCBSCi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDcgMCBSCj4+Cj4+Ci9Db250ZW50cyA0IDAgUgo+PgplbmRvYmoKCjYgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFsgNSAwIFIgXQovQ291bnQgMQo+PgplbmRvYmoKCjcgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCi9Gb250RGVzY3JpcHRvciA4IDAgUgo+PgplbmRvYmoKCjggMCBvYmoKPDwKL1R5cGUgL0ZvbnREZXNjcmlwdG9yCi9Gb250TmFtZSAvSGVsdmV0aWNhCi9GbGFncyAzMgovSXRhbGljQW5nbGUgMAovQXNjZW50IDcyMAovRGVzY2VudCAtMjEwCi9DYXBIZWlnaHQgNzIwCi9BdmdXaWR0aCA0NDAKL1hIZWlnaHQgNTMwCi9TVGVtViA5MAo+PgplbmRvYmoKCjkgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDYgMCBSCj4+CmVuZG9iagoKMTAgMCBvYmoKPDwKL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDIwMzEyMDAwMCswMCcwMCcpCi9Qcm9kdWNlciAoVGVzdCBQREYpCj4+CmVuZG9iagoKeHJlZgo0NzgKdHJhaWxlcgo8PAovU2l6ZSAxMQovUm9vdCA5IDAgUgovSW5mbyAxMCAwIFIKPj4Kc3RhcnR4cmVmCjU5NwolJUVPRg==";

// Test function
async function testPDFExtraction() {
  try {
    console.log('Testing PDF extraction...');
    
    // Import the extraction service
    const { extractPDFText } = await import('./services/extractionService');
    
    // Test the extraction
    const result = await extractPDFText(samplePDFBase64);
    
    console.log('PDF Extraction Result:', result);
    
    if (result.success) {
      console.log('✅ PDF extraction successful!');
      console.log('Extracted text:', result.text);
    } else {
      console.log('❌ PDF extraction failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Test failed:', error);
    return null;
  }
}

// Export for testing
window.testPDFExtraction = testPDFExtraction;

console.log('PDF extraction test function loaded. Run testPDFExtraction() to test.');