import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, BookOpen, Newspaper, FileImage } from "lucide-react";

interface ReportDesignSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDesign: (designId: string) => void;
}

const reportDesigns = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Clean and corporate design with structured sections',
    icon: FileText,
    preview: 'Modern sans-serif fonts, clear headings, and data tables',
    style: {
      font: 'Inter, sans-serif',
      layout: 'Structured with cover page and sections',
      colors: 'Navy blue accents with professional gray tones'
    }
  },
  {
    id: 'executive',
    name: 'Executive Summary',
    description: 'Concise format focusing on key insights and metrics',
    icon: BookOpen,
    preview: 'Bold headings, prominent charts, executive highlights',
    style: {
      font: 'Roboto, sans-serif',
      layout: 'Dashboard-style with KPIs upfront',
      colors: 'Deep blue with gold highlights'
    }
  },
  {
    id: 'modern',
    name: 'Modern Magazine',
    description: 'Contemporary design with visual emphasis',
    icon: Newspaper,
    preview: 'Large typography, full-width graphics, modern aesthetics',
    style: {
      font: 'Poppins, sans-serif',
      layout: 'Magazine-style with visual hierarchy',
      colors: 'Vibrant blues with creative accents'
    }
  },
  {
    id: 'academic',
    name: 'Academic Report',
    description: 'Formal structure with detailed citations and references',
    icon: FileImage,
    preview: 'Traditional serif fonts, structured bibliography, formal tone',
    style: {
      font: 'Georgia, serif',
      layout: 'Traditional academic format with footnotes',
      colors: 'Classic black text with minimal color'
    }
  }
];

export default function ReportDesignSelectionDialog({ 
  open, 
  onOpenChange, 
  onSelectDesign 
}: ReportDesignSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Report Design</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Select a design template for your report. You'll be able to preview it before downloading.
          </p>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {reportDesigns.map((design) => {
            const Icon = design.icon;
            return (
              <Card 
                key={design.id}
                className="cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-200 group"
                onClick={() => {
                  onSelectDesign(design.id);
                  onOpenChange(false);
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{design.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{design.description}</p>
                      
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="font-medium">Font:</span>{' '}
                          <span className="text-muted-foreground">{design.style.font}</span>
                        </div>
                        <div>
                          <span className="font-medium">Layout:</span>{' '}
                          <span className="text-muted-foreground">{design.style.layout}</span>
                        </div>
                        <div>
                          <span className="font-medium">Colors:</span>{' '}
                          <span className="text-muted-foreground">{design.style.colors}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Click to preview
                      </span>
                      <div className="h-2 w-16 bg-muted rounded group-hover:bg-primary/30 transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
