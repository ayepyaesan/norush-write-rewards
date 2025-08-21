import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo,
  Save,
  Type
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  isSaving?: boolean;
  placeholder?: string;
  wordCount?: number;
  targetWords?: number;
  title?: string;
  milestoneId?: string;
  disablePaste?: boolean;
}

export const RichTextEditor = ({ 
  content, 
  onChange, 
  onSave, 
  isSaving = false, 
  placeholder = "Start writing...",
  wordCount = 0,
  targetWords = 0,
  title = "Writing Editor",
  milestoneId,
  disablePaste = true
}: RichTextEditorProps) => {
  const { toast } = useToast();
  // 24-hour countdown timer state - MUST be before early returns
  const [timeRemaining, setTimeRemaining] = useState<number>(86400); // 24 hours in seconds

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Reset to 24 hours when timer reaches 0
          return 86400;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Initialize timer based on current day start
  useEffect(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const secondsRemaining = Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
    setTimeRemaining(Math.max(0, secondsRemaining));
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4',
      },
      handlePaste: (view, event) => {
        if (disablePaste) {
          event.preventDefault();
          
          // Track paste attempt in database
          if (milestoneId) {
            supabase
              .from('daily_milestones')
              .update({ 
                paste_attempts: (supabase as any).sql`paste_attempts + 1`
              })
              .eq('id', milestoneId);
          }
          
          toast({
            title: "Paste Disabled",
            description: "Copy-pasting is not allowed in this editor. Please type your content manually.",
            variant: "destructive",
          });
          
          return true; // Prevent default paste behavior
        }
        return false; // Allow paste if not disabled
      },
    },
  });

  const toggleBold = () => editor?.chain().focus().toggleBold().run();
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run();
  const toggleStrike = () => editor?.chain().focus().toggleStrike().run();
  const toggleBulletList = () => editor?.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor?.chain().focus().toggleOrderedList().run();
  const toggleBlockquote = () => editor?.chain().focus().toggleBlockquote().run();
  const undo = () => editor?.chain().focus().undo().run();
  const redo = () => editor?.chain().focus().redo().run();

  if (!editor) {
    return null;
  }

  return (
    <Card className="gradient-card border-0 shadow-warm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Type className="w-5 h-5" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{wordCount}</span>
              {targetWords > 0 && <span> / {targetWords}</span>} words
            </div>
            <Button 
              onClick={onSave}
              disabled={isSaving}
              className="gradient-warm hover-lift"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Toolbar */}
        <div className="border-b bg-muted/30 p-3">
          {/* Countdown Timer and Progress */}
          <div className="mb-3 p-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Countdown Timer */}
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-2xl font-mono font-bold text-primary">
                    {Math.floor(timeRemaining / 3600).toString().padStart(2, '0')}:
                    {Math.floor((timeRemaining % 3600) / 60).toString().padStart(2, '0')}:
                    {(timeRemaining % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="text-xs text-muted-foreground">Time Remaining</div>
                </div>
                <div className="h-8 w-px bg-border"></div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">
                    {wordCount} / {targetWords > 0 ? targetWords : 'N/A'}
                  </div>
                  <div className="text-xs text-muted-foreground">Words Today</div>
                </div>
              </div>

              {/* Refund Status */}
              <div className="text-right">
                <div className={`text-sm font-medium ${
                  wordCount >= (targetWords || 0) && timeRemaining > 0 
                    ? 'text-green-600' 
                    : timeRemaining <= 0 
                    ? 'text-red-500' 
                    : 'text-yellow-600'
                }`}>
                  {wordCount >= (targetWords || 0) && timeRemaining > 0 
                    ? '✅ Refund Eligible' 
                    : timeRemaining <= 0 
                    ? '❌ Deadline Missed' 
                    : `⏳ ${targetWords > 0 ? Math.max(0, targetWords - wordCount) : 0} words needed`
                  }
                </div>
                <div className="text-xs text-muted-foreground">
                  {timeRemaining > 0 
                    ? `Deadline: ${new Date(Date.now() + timeRemaining * 1000).toLocaleTimeString()}`
                    : 'Next goal tomorrow'
                  }
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Daily Progress</span>
                <span>{Math.round((wordCount / (targetWords || 1)) * 100)}%</span>
              </div>
              <div className="w-full bg-secondary/50 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    wordCount >= (targetWords || 0) 
                      ? 'bg-gradient-to-r from-green-500 to-green-400' 
                      : 'bg-gradient-to-r from-primary to-accent'
                  }`}
                  style={{ 
                    width: `${Math.min(100, (wordCount / (targetWords || 1)) * 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Formatting buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleBold}
                className={cn(
                  "h-8 w-8 p-0",
                  editor.isActive('bold') && "bg-primary text-primary-foreground"
                )}
              >
                <Bold className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleItalic}
                className={cn(
                  "h-8 w-8 p-0",
                  editor.isActive('italic') && "bg-primary text-primary-foreground"
                )}
              >
                <Italic className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleStrike}
                className={cn(
                  "h-8 w-8 p-0",
                  editor.isActive('strike') && "bg-primary text-primary-foreground"
                )}
              >
                <Underline className="w-4 h-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* List buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleBulletList}
                className={cn(
                  "h-8 w-8 p-0",
                  editor.isActive('bulletList') && "bg-primary text-primary-foreground"
                )}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleOrderedList}
                className={cn(
                  "h-8 w-8 p-0",
                  editor.isActive('orderedList') && "bg-primary text-primary-foreground"
                )}
              >
                <ListOrdered className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleBlockquote}
                className={cn(
                  "h-8 w-8 p-0",
                  editor.isActive('blockquote') && "bg-primary text-primary-foreground"
                )}
              >
                <Quote className="w-4 h-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Undo/Redo buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={undo}
                disabled={!editor.can().undo()}
                className="h-8 w-8 p-0"
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={redo}
                disabled={!editor.can().redo()}
                className="h-8 w-8 p-0"
              >
                <Redo className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Editor Content */}
        <div className="min-h-[500px] bg-background">
          <EditorContent 
            editor={editor} 
            className="h-full [&_.ProseMirror]:min-h-[500px] [&_.ProseMirror]:p-6 [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:text-base [&_.ProseMirror]:leading-relaxed"
          />
        </div>

        {/* Footer with word count and target */}
        <div className="border-t bg-muted/20 p-3">
          <div className="flex justify-between items-center text-sm">
            <div className="text-muted-foreground">
              Words written: <span className="font-medium text-foreground">{wordCount}</span>
              {targetWords > 0 && (
                <>
                  {' • '}Target: <span className="font-medium text-foreground">{targetWords}</span>
                  {' • '}Remaining: <span className="font-medium text-foreground">{Math.max(0, targetWords - wordCount)}</span>
                </>
              )}
            </div>
            {targetWords > 0 && (
              <div className="flex items-center gap-2">
                {wordCount >= targetWords ? (
                  <span className="text-green-600 font-medium">✓ Target achieved!</span>
                ) : (
                  <span className="text-muted-foreground">
                    {Math.round((wordCount / targetWords) * 100)}% complete
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};