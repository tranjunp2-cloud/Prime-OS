import { useState } from 'react';
import { Shield, AlertTriangle, Plus, X, FileCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { type SafetyComplianceGroup as SafetyData } from '@/lib/listing-groups';

interface SafetyComplianceGroupProps {
  data: SafetyData;
  onChange: (data: SafetyData) => void;
  platform: 'amazon' | 'shopee' | 'rakuten';
  errors?: Record<string, string>;
}

const COMMON_DECLARATIONS = [
  'This product complies with all applicable safety standards',
  'Product tested and certified by an accredited laboratory',
  'No hazardous materials or chemicals',
  'Suitable for intended use as described',
  'Meets FDA food safety requirements',
  'Contains allergen information on packaging',
];

const PLATFORM_ATTRIBUTES: Record<string, { id: string; name: string; description: string }[]> = {
  amazon: [
    { id: 'cpsia_warning', name: 'CPSIA Warning', description: 'Consumer Product Safety Improvement Act warning if applicable' },
    { id: 'prop65_warning', name: 'Prop 65 Warning', description: 'California Proposition 65 warning if applicable' },
    { id: 'fda_statement', name: 'FDA Statement', description: 'FDA compliance statement for food products' },
  ],
  shopee: [
    { id: 'halal_cert', name: 'Halal Certification', description: 'Halal certificate number if applicable' },
    { id: 'bpom_cert', name: 'BPOM Registration', description: 'Indonesian FDA registration number' },
  ],
  rakuten: [
    { id: 'jis_compliance', name: 'JIS Compliance', description: 'Japanese Industrial Standards compliance' },
    { id: 'food_labeling', name: 'Food Labeling Act', description: 'Compliance with Japanese food labeling regulations' },
  ],
};

export function SafetyComplianceGroup({ 
  data, 
  onChange, 
  platform,
  errors = {} 
}: SafetyComplianceGroupProps) {
  const [newDeclaration, setNewDeclaration] = useState('');

  const toggleDeclaration = (declaration: string) => {
    const exists = data.safetyDeclarations.includes(declaration);
    const updated = exists
      ? data.safetyDeclarations.filter(d => d !== declaration)
      : [...data.safetyDeclarations, declaration];
    onChange({ ...data, safetyDeclarations: updated });
  };

  const addCustomDeclaration = () => {
    if (newDeclaration.trim() && !data.safetyDeclarations.includes(newDeclaration.trim())) {
      onChange({ 
        ...data, 
        safetyDeclarations: [...data.safetyDeclarations, newDeclaration.trim()] 
      });
      setNewDeclaration('');
    }
  };

  const removeDeclaration = (declaration: string) => {
    onChange({ 
      ...data, 
      safetyDeclarations: data.safetyDeclarations.filter(d => d !== declaration) 
    });
  };

  const handleAttributeChange = (attrId: string, value: string) => {
    onChange({
      ...data,
      complianceAttributes: {
        ...data.complianceAttributes,
        [attrId]: value,
      },
    });
  };

  const platformAttrs = PLATFORM_ATTRIBUTES[platform] || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-5" />
          Group 7: Safety & Compliance
        </CardTitle>
        <CardDescription>
          Regulatory information and safety declarations required by the marketplace
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* Regulatory Info */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="regulatoryInfo">Regulatory Information</Label>
          <Textarea
            id="regulatoryInfo"
            value={data.regulatoryInfo || ''}
            onChange={(e) => onChange({ ...data, regulatoryInfo: e.target.value })}
            placeholder="Enter any regulatory information, certifications, or compliance notes..."
            rows={3}
          />
        </div>

        {/* Safety Declarations */}
        <div className="flex border-t pt-4 flex-col gap-4">
          <Label className="flex items-center gap-2">
            <FileCheck className="size-4" />
            Safety Declarations
          </Label>
          
          <div className="flex flex-col gap-2">
            {COMMON_DECLARATIONS.map((declaration) => (
              <div key={declaration} className="flex items-center gap-3">
                <Checkbox
                  id={declaration}
                  checked={data.safetyDeclarations.includes(declaration)}
                  onCheckedChange={() => toggleDeclaration(declaration)}
                />
                <Label htmlFor={declaration} className="font-normal cursor-pointer text-sm">
                  {declaration}
                </Label>
              </div>
            ))}
          </div>

          {/* Custom Declarations */}
          {data.safetyDeclarations.filter(d => !COMMON_DECLARATIONS.includes(d)).length > 0 && (
            <div className="flex mt-3 flex-col gap-2">
              <Label className="text-sm text-muted-foreground">Custom Declarations:</Label>
              {data.safetyDeclarations
                .filter(d => !COMMON_DECLARATIONS.includes(d))
                .map((declaration) => (
                  <div key={declaration} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <span className="text-sm flex-1">{declaration}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => removeDeclaration(declaration)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={newDeclaration}
              onChange={(e) => setNewDeclaration(e.target.value)}
              placeholder="Add custom declaration..."
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={addCustomDeclaration}>
              <Plus className="size-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {/* Platform-Specific Attributes */}
        {platformAttrs.length > 0 && (
          <div className="flex border-t pt-4 flex-col gap-4">
            <div className="flex items-center gap-2">
              <Label>Platform-Specific Compliance</Label>
              <Badge variant="secondary" className="capitalize">{platform}</Badge>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {platformAttrs.map((attr) => (
                <div key={attr.id} className="flex flex-col gap-2">
                  <Label htmlFor={attr.id} className="text-sm">{attr.name}</Label>
                  <Input
                    id={attr.id}
                    value={data.complianceAttributes[attr.id] || ''}
                    onChange={(e) => handleAttributeChange(attr.id, e.target.value)}
                    placeholder={attr.description}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg border border-warning/30">
          <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-warning">Important</p>
            <p className="text-muted-foreground">
              Ensure all safety and compliance information is accurate. Incorrect or missing 
              compliance data may result in listing rejection or account suspension.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
