import { useState } from 'react';
import { Sparkles, Check, X, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { type AISuggestion, getConfidenceColor, getConfidenceLabel } from '@/lib/ai-suggestions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface AISuggestionPanelProps {
  suggestions: AISuggestion[];
  onAccept: (suggestion: AISuggestion, editedValue?: string) => void;
  onReject: (suggestion: AISuggestion) => void;
  loading?: boolean;
}

export function AISuggestionPanel({ suggestions, onAccept, onReject, loading }: AISuggestionPanelProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['title', 'description']));
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [rejectedFields, setRejectedFields] = useState<Set<string>>(new Set());
  const [acceptedFields, setAcceptedFields] = useState<Set<string>>(new Set());

  const toggleExpanded = (field: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };

  const handleEdit = (suggestion: AISuggestion) => {
    setEditingField(suggestion.field);
    setEditValue(suggestion.suggestedValue);
  };

  const handleSaveEdit = (suggestion: AISuggestion) => {
    onAccept(suggestion, editValue);
    setAcceptedFields((prev) => new Set(prev).add(suggestion.field));
    setEditingField(null);
    setEditValue('');
  };

  const handleAccept = (suggestion: AISuggestion) => {
    onAccept(suggestion);
    setAcceptedFields((prev) => new Set(prev).add(suggestion.field));
  };

  const handleReject = (suggestion: AISuggestion) => {
    onReject(suggestion);
    setRejectedFields((prev) => new Set(prev).add(suggestion.field));
  };

  const activeSuggestions = suggestions.filter(
    (s) => !rejectedFields.has(s.field) && !acceptedFields.has(s.field)
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="size-4 text-primary animate-pulse" />
            Generating AI Suggestions...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/4 mb-2" />
                <div className="h-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            AI Suggestions
          </CardTitle>
          <Badge variant="secondary">
            {activeSuggestions.length} available
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {acceptedFields.size > 0 && (
          <div className="text-xs text-success flex items-center gap-1">
            <Check className="size-3" />
            {acceptedFields.size} suggestion(s) applied
          </div>
        )}

        {activeSuggestions.map((suggestion) => (
          <Collapsible
            key={suggestion.field}
            open={expandedItems.has(suggestion.field)}
            onOpenChange={() => toggleExpanded(suggestion.field)}
          >
            <div className="border rounded-lg overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="font-medium capitalize">{suggestion.field}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={cn('font-medium', getConfidenceColor(suggestion.confidence))}>
                          {getConfidenceLabel(suggestion.confidence)} confidence
                        </span>
                        <Progress value={suggestion.confidence} className="w-16 h-1.5" />
                        <span className="text-muted-foreground">{suggestion.confidence}%</span>
                      </div>
                    </div>
                  </div>
                  {expandedItems.has(suggestion.field) ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="flex px-3 pb-3 border-t flex-col gap-3">
                  <div className="pt-3">
                    <p className="text-xs text-muted-foreground mb-2">Suggested value:</p>
                    {editingField === suggestion.field ? (
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        rows={4}
                        className="text-sm"
                      />
                    ) : (
                      <div className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {suggestion.suggestedValue}
                      </div>
                    )}
                  </div>

                  <div className="bg-primary/5 rounded-md p-2">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Why: </span>
                      {suggestion.reason}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingField === suggestion.field ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(suggestion)}
                        >
                          <Check className="size-3 mr-1" />
                          Save & Apply
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingField(null);
                            setEditValue('');
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(suggestion)}
                        >
                          <Check className="size-3 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(suggestion)}
                        >
                          <Edit2 className="size-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReject(suggestion)}
                        >
                          <X className="size-3 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
