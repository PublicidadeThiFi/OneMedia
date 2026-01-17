import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

import { Reservation, ReservationStatus } from '../types';
import { useReservations } from '../hooks/useReservations';
import { ReservationDayCard } from './reservations/ReservationDayCard';
import { ReservationDetailsDrawer } from './reservations/ReservationDetailsDrawer';

function daysBetweenInclusive(start: Date, end: Date) {
  const s = new Date(start);
  const e = new Date(end);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  const diff = e.getTime() - s.getTime();
  if (diff < 0) return 0;
  return Math.floor(diff / 86_400_000) + 1;
}

function estimateReservationAmount(r: Reservation): number | undefined {
  const unitDay = (r as any).mediaUnitPriceDay as number | null | undefined;
  const pointDay = (r as any).mediaPointBasePriceDay as number | null | undefined;
  const dayRate = typeof unitDay === 'number' ? unitDay : typeof pointDay === 'number' ? pointDay : undefined;
  if (typeof dayRate !== 'number' || Number.isNaN(dayRate) || dayRate <= 0) return undefined;

  const start = new Date(r.startDate);
  const end = new Date(r.endDate);
  const days = daysBetweenInclusive(start, end);
  if (!days) return undefined;

  return dayRate * days;
}

export function Reservations() {
  // State para calendário
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  // State para filtros
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // State para drawer de detalhes
  const [detailsDrawerReservation, setDetailsDrawerReservation] = useState<
    (Reservation & { estimatedAmount?: number }) | null
  >(null);

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  // Calcular dias do mês
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);

  // Navegação de mês
  const previousMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
    setSelectedDay(null);
  };

  // Hook de reservas (busca apenas o mês atual)
  const startDateISO = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
  const endDateISO = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString();

  const {
    reservations,
    loading,
    error,
    refetch,
  } = useReservations({
    startDate: startDateISO,
    endDate: endDateISO,
    status: statusFilter === 'ALL' ? undefined : (statusFilter as ReservationStatus | string),
  });

  // Agrupar por dia (para marcar bolinha no calendário)
  // Importante: marcar TODOS os dias do período (startDate..endDate),
  // não apenas o dia inicial.
  const daysWithReservations = useMemo(() => {
    const set = new Set<number>();

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const monthStart = new Date(year, month, 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(year, month + 1, 0);
    monthEnd.setHours(0, 0, 0, 0);

    for (const res of reservations) {
      const start = new Date(res.startDate);
      const end = new Date(res.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      // Sem sobreposição com o mês atual
      if (end < monthStart || start > monthEnd) continue;

      const from = start < monthStart ? monthStart : start;
      const to = end > monthEnd ? monthEnd : end;

      // Itera dia a dia (inclusive)
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        if (d.getMonth() === month && d.getFullYear() === year) {
          set.add(d.getDate());
        }
      }
    }

    return set;
  }, [reservations, currentMonth]);

  const monthSummary = useMemo(() => {
    const active = reservations.filter((r) => r.status !== ReservationStatus.CANCELADA).length;
    const confirmed = reservations.filter((r) => r.status === ReservationStatus.CONFIRMADA).length;

    const totalAmount = reservations
      .filter((r) => r.status !== ReservationStatus.CANCELADA)
      .reduce((sum, r) => sum + (estimateReservationAmount(r) ?? 0), 0);

    return { activeCount: active, confirmedCount: confirmed, totalAmount };
  }, [reservations]);

  // Reservas do dia selecionado (overlap)
  const dayReservations = useMemo(() => {
    if (!selectedDay) return [];
    const startOfDay = new Date(selectedDay);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDay);
    endOfDay.setHours(23, 59, 59, 999);

    const list = reservations.filter((res) => {
      const s = new Date(res.startDate).getTime();
      const e = new Date(res.endDate).getTime();
      return s <= endOfDay.getTime() && e >= startOfDay.getTime();
    });

    if (!searchTerm) return list;
    const q = searchTerm.toLowerCase();

    return list.filter((r) => {
      const hay = [
        (r as any).clientName,
        (r as any).mediaPointName,
        (r as any).mediaUnitLabel,
        (r as any).campaignName,
        (r as any).proposalTitle,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [selectedDay, reservations, searchTerm]);

  const selectedDayCount = useMemo(() => {
    if (!selectedDay) return 0;
    return dayReservations.filter((res) => res.status !== ReservationStatus.CANCELADA).length;
  }, [selectedDay, dayReservations]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Reservas</h1>
        <p className="text-gray-600">Visualize reservas por calendário.</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <p className="text-gray-600 text-sm mb-1">Reservas Ativas</p>
            <p className="text-gray-900">{monthSummary.activeCount}</p>
            <p className="text-gray-500 text-sm">No mês selecionado</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <p className="text-gray-600 text-sm mb-1">Confirmadas no Período</p>
            <p className="text-gray-900">{monthSummary.confirmedCount}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <p className="text-gray-600 text-sm mb-1">Dia Selecionado</p>
            <p className="text-gray-900">{selectedDayCount}</p>
            <p className="text-gray-500 text-sm">
              {selectedDay ? new Date(selectedDay).toLocaleDateString('pt-BR') : 'Selecione um dia'}
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <p className="text-gray-600 text-sm mb-1">Valor Estimado do Mês</p>
            <p className="text-gray-900">
              R${' '}
              {monthSummary.totalAmount.toLocaleString('pt-BR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </p>
            <p className="text-gray-500 text-xs">Baseado em preço/dia do inventário</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              {loading && <div>Carregando reservas...</div>}
              {!loading && error && <div>Erro ao carregar reservas.</div>}

              {/* Cabeçalho do Calendário */}
              <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="sm" onClick={previousMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-gray-900">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h2>
                <Button variant="ghost" size="sm" onClick={nextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Filtro de Status */}
              <div className="mb-4">
                <Select
                  value={statusFilter}
                  onValueChange={(value: string) => setStatusFilter(value as ReservationStatus | 'ALL')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os status</SelectItem>
                    <SelectItem value={ReservationStatus.RESERVADA}>Em negociação</SelectItem>
                    <SelectItem value={ReservationStatus.CONFIRMADA}>Confirmada</SelectItem>
                    <SelectItem value={ReservationStatus.CANCELADA}>Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Grade do Calendário */}
              <div className="grid grid-cols-7 gap-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <div key={day} className="text-center text-gray-600 text-sm py-2">
                    {day}
                  </div>
                ))}

                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                  const isSelected =
                    selectedDay &&
                    selectedDay.getDate() === day &&
                    selectedDay.getMonth() === currentMonth.getMonth() &&
                    selectedDay.getFullYear() === currentMonth.getFullYear();
                  const hasReservations = daysWithReservations.has(day);

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(dayDate)}
                      className={`aspect-square p-2 rounded-lg text-center transition-colors relative ${
                        isSelected ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 text-gray-900'
                      }`}
                    >
                      {day}
                      {hasReservations && (
                        <div
                          className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${
                            isSelected ? 'bg-white' : 'bg-indigo-600'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Painel Lateral - Reservas do Dia */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="mb-4">
                <h3 className="text-gray-900 mb-2">
                  Reservas do dia {selectedDay ? new Date(selectedDay).toLocaleDateString('pt-BR') : '-'}
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar ponto, cliente, proposta..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {dayReservations.length > 0 ? (
                  dayReservations.map((reservation) => {
                    const amount = estimateReservationAmount(reservation);
                    return (
                      <ReservationDayCard
                        key={reservation.id}
                        reservation={reservation}
                        clientName={(reservation as any).clientName ?? undefined}
                        unitLabel={(reservation as any).mediaUnitLabel ?? undefined}
                        pointName={(reservation as any).mediaPointName ?? undefined}
                        amount={amount}
                        onClick={() =>
                          setDetailsDrawerReservation({
                            ...reservation,
                            estimatedAmount: amount,
                          })
                        }
                      />
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {selectedDay ? 'Nenhuma reserva neste dia' : 'Selecione um dia no calendário'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Drawer de Detalhes */}
      <ReservationDetailsDrawer
        open={!!detailsDrawerReservation}
        onOpenChange={(open: boolean) => !open && setDetailsDrawerReservation(null)}
        reservation={detailsDrawerReservation}
        clientName={(detailsDrawerReservation as any)?.clientName ?? undefined}
        unitLabel={(detailsDrawerReservation as any)?.mediaUnitLabel ?? undefined}
        pointName={(detailsDrawerReservation as any)?.mediaPointName ?? undefined}
        amount={detailsDrawerReservation?.estimatedAmount}
      />
    </div>
  );
}
