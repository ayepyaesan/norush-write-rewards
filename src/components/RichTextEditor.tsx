import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Bold, 
  Italic, 
  Underline, 
  Save, 
  Download,
  Type,
  Heading1,
  Heading2,
  Heading3,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import html2pdf from 'html2pdf.js';

interface RichTextEditorProps {
  onClose?: () => void;
  taskName?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ onClose, taskName = "Document" }) => {
  const [wordCount, setWordCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const storageKey = `rich-text-editor-${taskName}`;

  useEffect(() => {
    // Load saved content from localStorage
    const savedContent = localStorage.getItem(storageKey);
    if (savedContent && editorRef.current) {
      editorRef.current.innerHTML = savedContent;
      updateWordCount();
    }
  }, [storageKey]);

  const updateWordCount = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      setWordCount(words.length);
    }
  }, []);

  const handleInput = useCallback(() => {
    updateWordCount();
  }, [updateWordCount]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    toast({
      title: "Paste Disabled",
      description: "You must type directly. Copy functionality is still available.",
      variant: "destructive",
    });
  }, [toast]);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  const applyHeading = useCallback((level: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (selectedText) {
      const headingElement = document.createElement(level);
      headingElement.textContent = selectedText;
      range.deleteContents();
      range.insertNode(headingElement);
      
      // Clear selection and place cursor after heading
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStartAfter(headingElement);
      newRange.collapse(true);
      selection.addRange(newRange);
    }
    
    editorRef.current?.focus();
  }, []);

  const saveToLocalStorage = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      localStorage.setItem(storageKey, content);
      setLastSaved(new Date());
      toast({
        title: "Document Saved",
        description: "Your work has been saved to local storage.",
      });
    }
  }, [storageKey, toast]);

  const exportToPDF = useCallback(async () => {
    if (!editorRef.current) return;

    const element = editorRef.current.cloneNode(true) as HTMLElement;
    
    // Create a temporary container with proper styling for PDF
    const pdfContainer = document.createElement('div');
    pdfContainer.style.cssText = `
      padding: 40px;
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: black;
      background: white;
      max-width: 210mm;
      margin: 0 auto;
    `;
    
    // Apply styles to headings
    const headings = element.querySelectorAll('h1, h2, h3');
    headings.forEach((heading) => {
      const tag = heading.tagName.toLowerCase();
      if (tag === 'h1') {
        (heading as HTMLElement).style.cssText = 'font-size: 18pt; font-weight: bold; margin: 20px 0 10px 0;';
      } else if (tag === 'h2') {
        (heading as HTMLElement).style.cssText = 'font-size: 16pt; font-weight: bold; margin: 16px 0 8px 0;';
      } else if (tag === 'h3') {
        (heading as HTMLElement).style.cssText = 'font-size: 14pt; font-weight: bold; margin: 12px 0 6px 0;';
      }
    });

    pdfContainer.appendChild(element);

    const opt = {
      margin: [0.5, 0.5],
      filename: `${taskName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    try {
      await html2pdf().set(opt).from(pdfContainer).save();
      toast({
        title: "PDF Exported",
        description: `${taskName}.pdf has been downloaded.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting your document to PDF.",
        variant: "destructive",
      });
    }
  }, [taskName, toast]);

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Toolbar */}
      <div className="border-b bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center space-x-1">
            {/* Formatting Tools */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => execCommand('bold')}
              className="h-8 w-8 p-0"
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => execCommand('italic')}
              className="h-8 w-8 p-0"
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => execCommand('underline')}
              className="h-8 w-8 p-0"
              title="Underline (Ctrl+U)"
            >
              <Underline className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-2" />

            {/* Heading Tools */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyHeading('h1')}
              className="h-8 w-8 p-0"
              title="Heading 1"
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyHeading('h2')}
              className="h-8 w-8 p-0"
              title="Heading 2"
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyHeading('h3')}
              className="h-8 w-8 p-0"
              title="Heading 3"
            >
              <Heading3 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={saveToLocalStorage}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export PDF</span>
            </Button>

            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto bg-background">
        <div className="max-w-4xl mx-auto p-8">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onPaste={handlePaste}
            className="min-h-[calc(100vh-200px)] bg-background border-0 outline-none prose prose-lg max-w-none focus:outline-none"
            style={{
              fontFamily: 'Times New Roman, serif',
              fontSize: '12pt',
              lineHeight: '1.6',
              padding: '40px',
              backgroundColor: 'white',
              boxShadow: '0 0 10px rgba(0,0,0,0.1)',
              borderRadius: '4px',
            }}
            data-placeholder="Start typing your document..."
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="border-t bg-muted/30 px-4 py-2 flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <Type className="h-4 w-4" />
            <span>{wordCount} words</span>
          </span>
          {lastSaved && (
            <span>
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="text-xs">
          Press Ctrl+B/I/U for formatting • Paste is disabled
        </div>
      </div>
    </div>
  );
};