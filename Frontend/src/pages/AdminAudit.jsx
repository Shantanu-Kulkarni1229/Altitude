import React, { useState, useEffect } from 'react';
import { ShieldAlert, Bot, User, Check, X, TrendingUp, AlertTriangle, ShieldX } from 'lucide-react';
import axios from 'axios';

export default function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        const [logsRes, analyticsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/v1/audit'),
          axios.get('http://localhost:5000/api/v1/analytics/summary')
        ]);
        setLogs(logsRes.data.data);
        setAnalytics(analyticsRes.data.data);
      } catch (error) {
        console.error('Error fetching audit data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAuditData();
  }, []);

  return (
    <div className="bg-stone-50 min-h-screen pb-20 pt-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Analytics Header */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
              <div className="bg-emerald-100 text-emerald-600 p-3 rounded-lg"><TrendingUp className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Total Revenue</p>
                <p className="text-2xl font-bold text-stone-900">₹{analytics.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
              <div className="bg-stone-100 text-stone-600 p-3 rounded-lg"><Check className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Confirmed Bookings</p>
                <p className="text-2xl font-bold text-stone-900">{analytics.totalBookings}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
              <div className="bg-rose-100 text-rose-600 p-3 rounded-lg"><ShieldX className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Guardrail Blocks</p>
                <div className="text-xs text-stone-600 mt-1 space-y-0.5">
                  <p>Fitness: {analytics.rejectionsBreakdown.fitness} • Slots: {analytics.rejectionsBreakdown.slots}</p>
                  <p>Budget: {analytics.rejectionsBreakdown.budget} • Addons: {analytics.rejectionsBreakdown.addonCap}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-8">
          <ShieldAlert className="w-8 h-8 text-stone-700" />
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Safety System Audit Log</h1>
            <p className="text-stone-500 text-sm">Immutable record of all booking decisions and guardrail interventions.</p>
          </div>
        </div>
        
        <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-100 text-stone-600 font-medium">
                <tr>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Decision</th>
                  <th className="px-6 py-4">Reason & Trace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-10 text-stone-500">Loading audit trail...</td></tr>
                ) : logs.map(log => (
                  <tr key={log._id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 text-stone-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.actor === 'agent' ? (
                        <span className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md text-xs font-semibold w-fit">
                          <Bot className="w-3.5 h-3.5" /> API Agent
                        </span>
                      ) : log.actor === 'system' ? (
                        <span className="flex items-center gap-1.5 text-stone-600 bg-stone-200 px-2.5 py-1 rounded-md text-xs font-semibold w-fit">
                          <AlertTriangle className="w-3.5 h-3.5" /> System Core
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-stone-600 bg-stone-100 px-2.5 py-1 rounded-md text-xs font-semibold w-fit">
                          <User className="w-3.5 h-3.5" /> Human (Web)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-stone-900">{log.action}</p>
                      <p className="text-stone-500 text-xs mt-0.5">₹{log.amount?.toLocaleString()}</p>
                      <p className="text-stone-400 text-[10px] mt-1 font-mono">ID: {log.correlationId || log._id}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.decision === 'approved' ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <Check className="w-4 h-4" /> Approved
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-600 font-medium">
                          <X className="w-4 h-4" /> Blocked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-stone-600">
                      <p className="font-medium text-stone-800">{log.reason}</p>
                      {log.trace && log.trace.length > 0 && (
                        <div className="mt-2 text-xs flex gap-2 flex-wrap">
                          {log.trace.map((t, idx) => (
                            <span key={idx} className={`px-1.5 py-0.5 rounded ${t.passed ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100 font-semibold'}`}>
                              {t.check}: {t.passed ? 'Pass' : 'Fail'}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
}
