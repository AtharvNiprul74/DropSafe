import { useEffect, useState } from 'react';
import { listModels } from '../../api/services/ai';
import type { AiModelMetadata } from '../../types/models';
import { Badge, Card, CardHeader, FullPageLoading, KV, PageHeader, StatusBadge } from '../../components/ui/primitives';
import { Table, THead, TBody, Tr, Th, Td } from '../../components/ui/Table';
import { PrivacyNote } from '../../components/ui/PrivacyNote';
import { useToast } from '../../components/ui/Toast';
import { formatDateTime } from '../../lib/format';

export default function ModelsPage() {
  const { notify } = useToast();
  const [models, setModels] = useState<AiModelMetadata[] | null>(null);

  useEffect(() => {
    listModels().then(setModels).catch((e) => notify(e?.message ?? 'Failed to load models', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!models) return <FullPageLoading label="Loading AI models…" />;

  const active = models.find((m) => m.status === 'ACTIVE');
  const retired = models.filter((m) => m.status === 'RETIRED');

  return (
    <div>
      <PageHeader
        title="AI Model Metadata"
        subtitle="Exactly one model version may be ACTIVE. Deployed metadata is immutable; retired models remain available for historical reference."
      />

      {active && (
        <Card className="mb-5 ring-2 ring-emerald-200">
          <CardHeader title="Active model" subtitle="Used for all new predictions" actions={<StatusBadge status="ACTIVE" />} />
          <div className="grid gap-x-10 px-5 py-2 sm:grid-cols-2">
            <KV k="Model name" v={<span className="font-semibold">{active.modelName}</span>} />
            <KV k="Version" v={<Badge tone="indigo">v{active.modelVersion}</Badge>} />
            <KV k="Algorithm" v={active.algorithm} />
            <KV k="Feature version" v={active.featureVersion} />
            <KV k="Training dataset version" v={active.trainingDatasetVersion} />
            <KV k="Deployed" v={formatDateTime(active.deployedAt)} />
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Retired versions" subtitle="Preserved — every prediction remains traceable to the model version that produced it" />
        <Table>
          <THead>
            <Tr><Th>Model</Th><Th>Version</Th><Th>Algorithm</Th><Th>Feature version</Th><Th>Dataset</Th><Th>Deployed</Th><Th>Status</Th></Tr>
          </THead>
          <TBody>
            {retired.map((m) => (
              <Tr key={m.id}>
                <Td className="font-medium">{m.modelName}</Td>
                <Td>v{m.modelVersion}</Td>
                <Td className="text-xs">{m.algorithm}</Td>
                <Td className="text-xs">{m.featureVersion}</Td>
                <Td className="text-xs">{m.trainingDatasetVersion}</Td>
                <Td className="text-xs text-slate-500">{formatDateTime(m.deployedAt)}</Td>
                <Td><StatusBadge status={m.status} /></Td>
              </Tr>
            ))}
            {retired.length === 0 && (
              <Tr><Td colSpan={7} className="py-6 text-center text-xs text-slate-400">No retired models yet.</Td></Tr>
            )}
          </TBody>
        </Table>
      </Card>

      <div className="mt-5">
        <PrivacyNote title="AI never touches source data">
          The ML service reads academic/behavioural evidence but must never modify it, and must not produce a
          prediction when required evidence is insufficient (PRD §30).
        </PrivacyNote>
      </div>
    </div>
  );
}
