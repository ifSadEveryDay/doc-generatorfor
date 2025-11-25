import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Card, CardBody, Divider, ScrollShadow, Spacer, Select, SelectItem } from "@heroui/react";
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { generateRandomData } from './utils/dataGenerator';

import TuitionTemplate from './components/TuitionTemplate';
import TranscriptTemplate from './components/TranscriptTemplate';
import ScheduleTemplate from './components/ScheduleTemplate';

const App = () => {
  const [formData, setFormData] = useState(generateRandomData());

  const [exportMode, setExportMode] = useState("stitched-horizontal"); // Default to horizontal stitched
  const [isGenerating, setIsGenerating] = useState(false);

  const tuitionRef = useRef(null);
  const transcriptRef = useRef(null);
  const scheduleRef = useRef(null);
  const containerRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const regenerateData = () => {
    setFormData(generateRandomData());
  };

  const exportStitched = async (forceHorizontal = false) => {
    if (!containerRef.current) return;
    setIsGenerating(true);
    
    // Store original styles
    const originalStyle = containerRef.current.style.cssText;
    const originalClass = containerRef.current.className;

    try {
      // Temporarily enforce styles if horizontal mode
      if (forceHorizontal) {
        containerRef.current.style.cssText = `
          display: flex;
          flex-direction: row;
          flex-wrap: nowrap;
          gap: 0;
          width: max-content;
          justify-content: flex-start;
          align-items: flex-start;
        `;
        // We need to ensure no class conflicts
        containerRef.current.className = ""; 
      }

      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#ffffff', // Ensure background is white for the stitched image
        scale: 2,
        useCORS: true,
        ignoreElements: (element) => element.classList.contains('doc-label'), // Hide labels
        onclone: (clonedDoc) => {
            // Optional: further manipulation of the cloned DOM if needed
            // But modifying the live DOM before capture is usually more reliable for layout
        }
      });
      
      canvas.toBlob((blob) => {
        saveAs(blob, "SheerID_Documents_Combined.png");
        setIsGenerating(false);
        
        // Restore styles
        if (forceHorizontal) {
            containerRef.current.style.cssText = originalStyle;
            containerRef.current.className = originalClass;
        }
      });
    } catch (err) {
      console.error(err);
      alert("Export failed");
      setIsGenerating(false);
      
      // Restore styles in case of error
      if (forceHorizontal) {
        containerRef.current.style.cssText = originalStyle;
        containerRef.current.className = originalClass;
    }
    }
  };

  const exportZipped = async () => {
    setIsGenerating(true);
    try {
      const zip = new JSZip();
      
      const capture = async (ref, name) => {
        if (!ref.current) return;
        const canvas = await html2canvas(ref.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true
        });
        return { name, data: canvas.toDataURL('image/png').split(',')[1] };
      };

      const images = await Promise.all([
        capture(tuitionRef, "Tuition_Statement.png"),
        capture(transcriptRef, "Transcript.png"),
        capture(scheduleRef, "Schedule.png")
      ]);

      images.forEach(img => {
        if(img) zip.file(img.name, img.data, {base64: true});
      });

      const content = await zip.generateAsync({type:"blob"});
      saveAs(content, "SheerID_Documents.zip");
      setIsGenerating(false);

    } catch (err) {
      console.error(err);
      alert("Export failed");
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    if (exportMode === "stitched") {
      exportStitched(false);
    } else if (exportMode === "stitched-horizontal") {
      exportStitched(true);
    } else {
      exportZipped();
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar Controls */}
      <div className="w-80 flex-shrink-0 border-r border-divider bg-content1">
        <ScrollShadow className="h-full p-6">
          <h2 className="text-2xl font-bold mb-4 text-primary">Input Information</h2>

          <Button 
            color="secondary" 
            variant="flat"
            className="w-full mb-6"
            onClick={regenerateData}
          >
            Regenerate Random Data
          </Button>
          
          <div className="flex flex-col gap-6">
            <Input label="University Name" name="universityName" value={formData.universityName} onChange={handleInputChange} variant="bordered" labelPlacement="outside" placeholder="Enter university name" />
            <Input label="Student Name" name="studentName" value={formData.studentName} onChange={handleInputChange} variant="bordered" labelPlacement="outside" placeholder="Enter student name" />
            <Input label="Student ID" name="studentID" value={formData.studentID} onChange={handleInputChange} variant="bordered" labelPlacement="outside" placeholder="Enter student ID" />
            <Input label="Address" name="address" value={formData.address} onChange={handleInputChange} variant="bordered" labelPlacement="outside" placeholder="Enter address" />
            <Input label="Term" name="term" value={formData.term} onChange={handleInputChange} variant="bordered" labelPlacement="outside" placeholder="Enter term" />
            <Input label="Major" name="major" value={formData.major} onChange={handleInputChange} variant="bordered" labelPlacement="outside" placeholder="Enter major" />
            <Input label="Program" name="program" value={formData.program} onChange={handleInputChange} variant="bordered" labelPlacement="outside" placeholder="Enter program" />
            <Input label="College" name="college" value={formData.college} onChange={handleInputChange} variant="bordered" labelPlacement="outside" placeholder="Enter college" />
            
            <Divider className="my-2" />
            <h3 className="text-xl font-semibold">Dates</h3>
            
            <Input label="Statement Date" name="statementDate" value={formData.statementDate} onChange={handleInputChange} variant="bordered" labelPlacement="outside" placeholder="MM/DD/YYYY" />
            <Input label="Due Date" name="dueDate" value={formData.dueDate} onChange={handleInputChange} variant="bordered" labelPlacement="outside" placeholder="MM/DD/YYYY" />
            <Input label="Issue Date" name="issueDate" value={formData.issueDate} onChange={handleInputChange} variant="bordered" labelPlacement="outside" placeholder="MM/DD/YYYY" />
            
            <Divider className="my-2" />
            
            <Select 
              label="Export Format" 
              selectedKeys={[exportMode]} 
              onChange={(e) => setExportMode(e.target.value)}
              variant="bordered"
              labelPlacement="outside"
            >
              <SelectItem key="stitched" value="stitched">One Stitched Image (Grid)</SelectItem>
              <SelectItem key="stitched-horizontal" value="stitched-horizontal">One Stitched Image (Horizontal Row)</SelectItem>
              <SelectItem key="zipped" value="zipped">Three Separate Images (Zip)</SelectItem>
            </Select>

            <Button 
              color="primary" 
              className="w-full font-bold text-lg mt-4" 
              size="lg"
              onClick={handleExport}
              isLoading={isGenerating}
            >
              {isGenerating ? "Generating..." : "Download"}
            </Button>
          </div>
        </ScrollShadow>
      </div>

      {/* Main Preview Area */}
      <div className="flex-grow overflow-y-auto bg-zinc-900 p-8">
        <div className="flex justify-center">
            {/* Container for stitching - Flex row to simulate horizontal stitch if needed, or grid */}
            {/* Original had grid-template-columns: repeat(auto-fit, ...). 
                If we want "Stitched" to look like a long horizontal strip (like the print media query in original), 
                we can conditionally style this.
                However, for preview, vertical stack or grid is better.
                Let's use a flexible wrap layout.
            */}
            <div 
                ref={containerRef} 
                className="flex flex-row flex-wrap justify-center gap-5 w-max max-w-full"
                style={{
                    // If stitching, we might want to force a row layout during capture?
                    // For now, we'll let html2canvas capture as is.
                    // To ensure specific stitch layout (e.g. side-by-side), we might need a temporary container.
                    // But the original user asked for "Three separate or stitched".
                    // Assuming "Stitched" means combined into one image. 
                    // If the preview is side-by-side, the image will be side-by-side.
                }}
            >
                <div className="relative group">
                    <div className="absolute -top-6 left-0 bg-zinc-800 text-white px-3 py-1 rounded-t text-sm doc-label">Tuition Statement</div>
                    <TuitionTemplate ref={tuitionRef} data={formData} />
                </div>
                
                <div className="relative group">
                    <div className="absolute -top-6 left-0 bg-zinc-800 text-white px-3 py-1 rounded-t text-sm doc-label">Transcript</div>
                    <TranscriptTemplate ref={transcriptRef} data={formData} />
                </div>

                <div className="relative group">
                    <div className="absolute -top-6 left-0 bg-zinc-800 text-white px-3 py-1 rounded-t text-sm doc-label">Course Schedule</div>
                    <ScheduleTemplate ref={scheduleRef} data={formData} />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;
