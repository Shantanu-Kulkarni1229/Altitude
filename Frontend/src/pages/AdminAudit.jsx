import React from 'react';
import { ShieldAlert, Bot, User, Check, X } from 'lucide-react';

const mockLogs = [
  { id: 1, time: '10:42 AM', actor: 'human', action: 'Booking Request', trek: 'Valley of Flowers', amount: '₹13,000', decision: 'approved', reason: 'Within budget, fitness match, slots available.' },
  { id: 2, time: '10:40 AM', actor: 'agent', action: 'Booking Request', trek: 'Stok Kangri', amount: '₹28,000', decision: 'rejected', reason: 'Safety Guardrail: Beginner fitness level does not match Extreme difficulty.' },
  { id: 3, time: '10:35 AM', actor: 'agent', action: 'Add-on Request', trek: 'Valley of Flowers', amount: '₹8,500', decision: 'rejected', reason: 'Add-on spending cap exceeded (Max 25% of base).' }
];

export default function AdminAudit() {
  return (
    <div className="bg-stone-50 min-h-screen pb-20 pt-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  <th className="px-6 py-4">Request</th>
                  <th className="px-6 py-4">Decision</th>
                  <th className="px-6 py-4">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {mockLogs.map(log => (
                  <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 text-stone-500 whitespace-nowrap">{log.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.actor === 'agent' ? (
                        <span className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md text-xs font-semibold w-fit">
                          <Bot className="w-3.5 h-3.5" /> API Agent
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-stone-600 bg-stone-100 px-2.5 py-1 rounded-md text-xs font-semibold w-fit">
                          <User className="w-3.5 h-3.5" /> Human (Web)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-stone-900">{log.action}</p>
                      <p className="text-stone-500 text-xs">{log.trek} • {log.amount}</p>
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
                    <td className="px-6 py-4 text-stone-600 max-w-xs">{log.reason}</td>
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
