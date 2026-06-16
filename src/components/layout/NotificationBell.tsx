'use client';

import { useState, useEffect } from 'react';
import { Bell, Package, TrendingUp, TrendingDown, Check } from 'lucide-react';
import { getUserNotifications, markNotificationAsRead, clearNotificationsAction, markAllNotificationsAsReadAction } from '@/app/actions/notification-actions';
import Link from 'next/link';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    const res = await getUserNotifications();
    if (res.success) {
      setNotifications(res.data || []);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Sondeo periódico cada 60 segundos
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    await markAllNotificationsAsReadAction();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setLoading(false);
  };

  const handleClearAll = async () => {
    if (confirm('¿Seguro que deseas limpiar todas las notificaciones?')) {
      setLoading(true);
      await clearNotificationsAction();
      setNotifications([]);
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'STOCK': return <Package className="w-4 h-4 text-emerald-400" />;
      case 'PRICE_SPIKE': return <TrendingUp className="w-4 h-4 text-red-400" />;
      case 'PRICE_DROP': return <TrendingDown className="w-4 h-4 text-emerald-400" />;
      default: return <Bell className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all relative"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-sm font-bold text-white">Notificaciones</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-semibold">
                  {unreadCount} nuevas
                </span>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No tienes notificaciones
                </div>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`p-4 border-b border-slate-800/50 flex gap-3 hover:bg-slate-800/30 transition-colors relative group ${!n.read ? 'bg-indigo-500/5' : ''}`}
                  >
                    <div className={`mt-1 p-1.5 rounded-lg flex-shrink-0 ${!n.read ? 'bg-slate-800' : 'bg-slate-900/50'}`}>
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold text-slate-200 mb-0.5 ${!n.read ? 'text-white' : ''}`}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                        {n.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-600">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                        {n.linkUrl && (
                          <Link 
                            href={n.linkUrl}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
                            onClick={() => setIsOpen(false)}
                          >
                            Ver detalle
                          </Link>
                        )}
                      </div>
                    </div>
                    {!n.read && (
                      <button 
                        onClick={() => handleMarkAsRead(n.id)}
                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded transition-all text-slate-400 hover:text-emerald-400"
                        title="Marcar como leída"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div className="p-3 bg-slate-900/80 border-t border-slate-800 flex justify-between items-center px-4">
              <button 
                onClick={handleMarkAllAsRead}
                disabled={loading || unreadCount === 0}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Marcar todas como leídas
              </button>
              <button 
                onClick={handleClearAll}
                disabled={loading || notifications.length === 0}
                className="text-[10px] text-slate-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Limpiar todas
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
