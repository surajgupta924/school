import { useGetAuditLogsQuery } from '../app/api';
import { Card, ErrorState, Loading, PageHeader } from '../components/ui';

export default function AuditLogsPage() {
  const { data: logs = [], isLoading, error, refetch } = useGetAuditLogsQuery({ limit: 100 });

  return (
    <div className="page">
      <PageHeader
        title="Audit Logs"
        subtitle="Security and operational activity across the school system."
      />
      <Card tight>
        {isLoading ? <Loading /> : error ? <ErrorState error={error} onRetry={refetch} /> : (
          <table className="fees-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="t-muted">No audit entries yet</td></tr>
              ) : logs.map((log) => (
                <tr key={log._id || log.id}>
                  <td>{log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : '—'}</td>
                  <td>
                    <div>{log.actorId?.name || log.actorRole || '—'}</div>
                    <div className="t-mono t-muted" style={{ fontSize: 11 }}>
                      {log.actorId?.email || log.actorRole || ''}
                    </div>
                  </td>
                  <td className="t-strong">{log.action}</td>
                  <td>{log.resource}{log.resourceId ? ` · ${log.resourceId}` : ''}</td>
                  <td className="t-mono">{log.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
