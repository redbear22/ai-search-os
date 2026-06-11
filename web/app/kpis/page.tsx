"use client";

import { useEffect, useState } from "react";
import { computeClarityAlignment, useKPIStore, type KPI } from "@/store/kpiStore";
import { useAuditStore } from "@/store/auditStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const layerColors: Record<KPI["layerId"], string> = {
  discoverability: "bg-blue-500",
  clarity: "bg-green-500",
  authority: "bg-purple-500",
  trust: "bg-orange-500",
};

const layerNames: Record<KPI["layerId"], string> = {
  discoverability: "Discoverability",
  clarity: "Clarity",
  authority: "Authority",
  trust: "Trust",
};

const ownerTeams = ["SEO", "PR", "Brand Strategy", "Product", "CX", "Content"];

const emptyNewKpi = {
  layerId: "discoverability" as KPI["layerId"],
  name: "",
  currentValue: 0,
  targetValue: 0,
  unit: "",
  ownerTeam: "SEO",
  ownerPerson: "",
};

function getProgress(current: number, target: number) {
  if (target === 0) return 0;
  return Math.min(100, (current / target) * 100);
}

export default function KPIPage() {
  const kpis = useKPIStore((s) => s.kpis);
  const updateKPI = useKPIStore((s) => s.updateKPI);
  const addKPI = useKPIStore((s) => s.addKPI);
  const deleteKPI = useKPIStore((s) => s.deleteKPI);

  const discoverability = useAuditStore((s) => s.discoverability);
  const clarity = useAuditStore((s) => s.clarity);
  const authority = useAuditStore((s) => s.authority);
  const trust = useAuditStore((s) => s.trust);

  const [editingKPI, setEditingKPI] = useState<KPI | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newKPI, setNewKPI] = useState(emptyNewKpi);

  useEffect(() => {
    void useKPIStore.persist.rehydrate();
  }, []);

  const autoFillFromAudit = () => {
    const auditData = { discoverability, clarity, authority, trust };

    kpis.forEach((kpi) => {
      let currentValue = kpi.currentValue;

      if (kpi.layerId === "discoverability" && kpi.name === "Brand Mentions") {
        currentValue = auditData.discoverability.aso.brandMentions;
      } else if (
        kpi.layerId === "discoverability" &&
        kpi.name === "AI Visibility Score"
      ) {
        currentValue = auditData.discoverability.aso.aiVisibilityScore;
      } else if (
        kpi.layerId === "clarity" &&
        kpi.name === "AI Description Alignment"
      ) {
        currentValue = computeClarityAlignment(auditData);
      } else if (
        kpi.layerId === "authority" &&
        kpi.name === "Unique Cited Sources"
      ) {
        currentValue = auditData.authority.sourcesCitingUs.length;
      } else if (kpi.layerId === "trust" && kpi.name === "Review Sentiment") {
        currentValue = auditData.trust.averageRating;
      }

      if (currentValue !== kpi.currentValue) {
        updateKPI(kpi.id, { currentValue });
      }
    });
  };

  const handleAddKpi = () => {
    addKPI({
      ...newKPI,
      id: Date.now().toString(),
      lastUpdated: new Date().toISOString(),
    });
    setIsAddDialogOpen(false);
    setNewKPI(emptyNewKpi);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">KPI Dashboard</h1>
          <p className="text-muted-foreground">
            Track AI search visibility metrics across all 4 layers
          </p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={autoFillFromAudit}>
            Auto-fill from Audit
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>+ Add KPI</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New KPI</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Layer</Label>
                  <Select
                    value={newKPI.layerId}
                    onValueChange={(v) =>
                      setNewKPI({ ...newKPI, layerId: v as KPI["layerId"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(layerNames).map(([id, name]) => (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>KPI Name</Label>
                  <Input
                    value={newKPI.name}
                    onChange={(e) => setNewKPI({ ...newKPI, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Current Value</Label>
                  <Input
                    type="number"
                    value={newKPI.currentValue}
                    onChange={(e) =>
                      setNewKPI({
                        ...newKPI,
                        currentValue: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Target Value</Label>
                  <Input
                    type="number"
                    value={newKPI.targetValue}
                    onChange={(e) =>
                      setNewKPI({
                        ...newKPI,
                        targetValue: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input
                    value={newKPI.unit}
                    onChange={(e) => setNewKPI({ ...newKPI, unit: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Owner Team</Label>
                  <Select
                    value={newKPI.ownerTeam}
                    onValueChange={(v) => setNewKPI({ ...newKPI, ownerTeam: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ownerTeams.map((team) => (
                        <SelectItem key={team} value={team}>
                          {team}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Owner Person</Label>
                  <Input
                    value={newKPI.ownerPerson}
                    onChange={(e) =>
                      setNewKPI({ ...newKPI, ownerPerson: e.target.value })
                    }
                  />
                </div>
                <Button onClick={handleAddKpi}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>KPIs by Layer</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveTable>
            <TableHeader>
              <TableRow>
                <TableHead>Layer</TableHead>
                <TableHead>KPI</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Owner Team</TableHead>
                <TableHead>Owner Person</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpis.map((kpi) => (
                <TableRow key={kpi.id}>
                  <TableCell>
                    <Badge className={layerColors[kpi.layerId]}>
                      {layerNames[kpi.layerId]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{kpi.name}</TableCell>
                  <TableCell>
                    {editingKPI?.id === kpi.id ? (
                      <Input
                        type="number"
                        value={editingKPI.currentValue}
                        onChange={(e) =>
                          setEditingKPI({
                            ...editingKPI,
                            currentValue: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-24"
                      />
                    ) : (
                      `${kpi.currentValue} ${kpi.unit}`
                    )}
                  </TableCell>
                  <TableCell>
                    {editingKPI?.id === kpi.id ? (
                      <Input
                        type="number"
                        value={editingKPI.targetValue}
                        onChange={(e) =>
                          setEditingKPI({
                            ...editingKPI,
                            targetValue: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-24"
                      />
                    ) : (
                      `${kpi.targetValue} ${kpi.unit}`
                    )}
                  </TableCell>
                  <TableCell className="w-32">
                    <Progress
                      value={getProgress(kpi.currentValue, kpi.targetValue)}
                      className="h-2"
                    />
                    <span className="text-xs text-muted-foreground">
                      {Math.round(getProgress(kpi.currentValue, kpi.targetValue))}%
                    </span>
                  </TableCell>
                  <TableCell>
                    {editingKPI?.id === kpi.id ? (
                      <Select
                        value={editingKPI.ownerTeam}
                        onValueChange={(v) =>
                          setEditingKPI({ ...editingKPI, ownerTeam: v })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ownerTeams.map((team) => (
                            <SelectItem key={team} value={team}>
                              {team}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      kpi.ownerTeam
                    )}
                  </TableCell>
                  <TableCell>
                    {editingKPI?.id === kpi.id ? (
                      <Input
                        value={editingKPI.ownerPerson}
                        onChange={(e) =>
                          setEditingKPI({ ...editingKPI, ownerPerson: e.target.value })
                        }
                        className="w-32"
                      />
                    ) : (
                      kpi.ownerPerson || "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(kpi.lastUpdated).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {editingKPI?.id === kpi.id ? (
                      <div className="space-x-1">
                        <Button
                          size="sm"
                          onClick={() => {
                            updateKPI(kpi.id, {
                              currentValue: editingKPI.currentValue,
                              targetValue: editingKPI.targetValue,
                              ownerTeam: editingKPI.ownerTeam,
                              ownerPerson: editingKPI.ownerPerson,
                            });
                            setEditingKPI(null);
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingKPI(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingKPI(kpi)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteKPI(kpi.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </ResponsiveTable>
        </CardContent>
      </Card>
    </div>
  );
}
