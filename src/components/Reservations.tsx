import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

import { Reservation, ReservationStatus, UnitType, MediaType } from '../types';
import { useReservations } from '../hooks/useReservations';
import { ReservationDayCard } from './reservations/ReservationDayCard';
import { ReservationDetailsDrawer } from './reservations/ReservationDetailsDrawer';
import { useTutorial } from '../contexts/TutorialContext';

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
  const rentTotalSnapshot = (r as any).rentTotalSnapshot as number | null | undefined;
  if (typeof rentTotalSnapshot === 'number' && Number.isFinite(rentTotalSnapshot) && rentTotalSnapshot > 0) {
    return rentTotalSnapshot;
  }

  const rentAmount = (r as any).rentAmount as number | null | undefined;
  const occupationDays = (r as any).occupationDays as number | null | undefined;

  if (typeof rentAmount === 'number' && Number.isFinite(rentAmount) && rentAmount > 0) {
    const occ = typeof occupationDays === 'number' && occupationDays > 0 ? occupationDays : undefined;
    const start = new Date(r.startDate);
    const end = new Date(r.endDate);
    const fallbackDays = daysBetweenInclusive(start, end);

    const days = occ ?? (fallbackDays || undefined);
    if (days) return rentAmount * days;
    return rentAmount;
  }

  const unitDay = (r as any).mediaUnitPriceDay as number | null | undefined;
  const pointDay = (r as any).mediaPointBasePriceDay as number | null | undefined;
  const dayRate =
    typeof unitDay === 'number' && Number.isFinite(unitDay) && unitDay > 0
      ? unitDay
      : typeof pointDay === 'number' && Number.isFinite(pointDay) && pointDay > 0
        ? pointDay
        : undefined;

  if (typeof dayRate !== 'number') return undefined;

  const start = new Date(r.startDate);
  const end = new Date(r.endDate);
  const days = daysBetweenInclusive(start, end);
  if (!days) return undefined;

  return dayRate * days;
}

export function Reservations() {
  const { activeTutorial, maybeOpenModuleTutorial, openModuleTutorial } = useTutorial();
  const isTutorialMode = activeTutorial?.moduleKey === 'reservations' || activeTutorial?.moduleKey === 'reservations-conflicts-flow';

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [detailsDrawerReservation, setDetailsDrawerReservation] = useState<(Reservation & { estimatedAmount?: number }) | null>(null);

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

  const startDateISO = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
  const endDateISO = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString();

  const { reservations, loading, error } = useReservations({
    startDate: startDateISO,
    endDate: endDateISO,
    status: statusFilter === 'ALL' ? undefined : (statusFilter as ReservationStatus | string),
  });

  const tutorialMockReservations = useMemo<Reservation[]>(() => {
    if (!isTutorialMode) return [];

    const baseDay = selectedDay
      ? new Date(selectedDay)
      : new Date(currentMonth.getFullYear(), currentMonth.getMonth(), Math.min(15, daysInMonth));
    baseDay.setHours(12, 0, 0, 0);

    const sameDay = new Date(baseDay);
    const nextDay = new Date(baseDay);
    nextDay.setDate(nextDay.getDate() + 1);
    const previousDay = new Date(baseDay);
    previousDay.setDate(previousDay.getDate() - 1);

    return [
      {
        id: 'tutorial-reservation-1',
        companyId: 'tutorial',
        mediaUnitId: 'tutorial-unit-1',
        mediaUnitLabel: 'Face Norte',
        mediaUnitType: UnitType.FACE,
        mediaPointId: 'tutorial-point-1',
        mediaPointName: 'Relógio Praça Central',
        mediaPointType: MediaType.OOH,
        mediaUnitPriceDay: 850,
        clientName: 'Farmácia Modelo',
        proposalTitle: 'Campanha de inauguração',
        campaignName: 'Inauguração Abril',
        startDate: previousDay.toISOString(),
        endDate: nextDay.toISOString(),
        status: ReservationStatus.RESERVADA,
        createdAt: previousDay.toISOString(),
        updatedAt: previousDay.toISOString(),
        rentAmount: 850,
        occupationDays: 3,
        rentTotalSnapshot: 2550,
      },
      {
        id: 'tutorial-reservation-2',
        companyId: 'tutorial',
        mediaUnitId: 'tutorial-unit-2',
        mediaUnitLabel: 'Face Sul',
        mediaUnitType: UnitType.FACE,
        mediaPointId: 'tutorial-point-1',
        mediaPointName: 'Relógio Praça Central',
        mediaPointType: MediaType.OOH,
        mediaUnitPriceDay: 900,
        clientName: 'Loja Exemplo',
        proposalTitle: 'Ação de semana promocional',
        campaignName: 'Semana Promocional',
        startDate: sameDay.toISOString(),
        endDate: nextDay.toISOString(),
        status: ReservationStatus.CONFIRMADA,
        createdAt: sameDay.toISOString(),
        updatedAt: sameDay.toISOString(),
        rentAmount: 900,
        occupationDays: 2,
        rentTotalSnapshot: 1800,
      },
    ];
  }, [currentMonth, daysInMonth, isTutorialMode, selectedDay]);

  const effectiveReservations = useMemo(
    () => (isTutorialMode && reservations.length === 0 ? tutorialMockReservations : reservations),
    [isTutorialMode, reservations, tutorialMockReservations],
  );

  const daysWithReservations = useMemo(() => {
    const set = new Set<number>();

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const monthStart = new Date(year, month, 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(year, month + 1, 0);
    monthEnd.setHours(0, 0, 0, 0);

    for (const res of effectiveReservations) {
      const start = new Date(res.startDate);
      const end = new Date(res.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      if (end < monthStart || start > monthEnd) continue;

      const from = start < monthStart ? monthStart : start;
      const to = end > monthEnd ? monthEnd : end;

      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        if (d.getMonth() === month && d.getFullYear() === year) {
          set.add(d.getDate());
        }
      }
    }

    return set;
  }, [currentMonth, effectiveReservations]);

  const monthSummary = useMemo(() => {
    const active = effectiveReservations.filter((r) => r.status !== ReservationStatus.CANCELADA).length;
    const confirmed = effectiveReservations.filter((r) => r.status === ReservationStatus.CONFIRMADA).length;

    const totalAmount = effectiveReservations
      .filter((r) => r.status !== ReservationStatus.CANCELADA)
      .reduce((sum, r) => sum + (estimateReservationAmount(r) ?? 0), 0);

    return { activeCount: active, confirmedCount: confirmed, totalAmount };
  }, [effectiveReservations]);

  const dayReservations = useMemo(() => {
    if (!selectedDay) return [];
    const startOfDay = new Date(selectedDay);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDay);
    endOfDay.setHours(23, 59, 59, 999);

    const list = effectiveReservations.filter((res) => {
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
  }, [effectiveReservations, searchTerm, selectedDay]);

  const selectedDayCount = useMemo(() => {
    if (!selectedDay) return 0;
    return dayReservations.filter((res) => res.status !== ReservationStatus.CANCELADA).length;
  }, [selectedDay, dayReservations]);

  useEffect(() => {
    if (activeTutorial) return;
    if (!selectedDay || dayReservations.length < 2) return;
    void maybeOpenModuleTutorial('reservations-conflicts-flow');
  }, [activeTutorial, dayReservations.length, maybeOpenModuleTutorial, selectedDay]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Reservas</h1>
        <p className="text-gray-600">Visualize reservas por calendário.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6" data-tour="reservations-status">
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
            <p className="text-gray-500 text-xs">Baseado no valor estimado das reservas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card data-tour="reservations-calendar">
            <CardContent className="pt-6">
              {loading && !effectiveReservations.length ? <div>Carregando reservas...</div> : null}
              {!loading && error && !effectiveReservations.length ? <div>Erro ao carregar reservas.</div> : null}

              <div className="flex items-center justify-between mb-6" data-tour="reservations-period">
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
                      {hasReservations ? (
                        <div
                          className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${
                            isSelected ? 'bg-white' : 'bg-indigo-600'
                          }`}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card data-tour="reservations-create">
            <CardContent className="pt-6">
              <div className="mb-4">
                <div className="flex items-center justify-between gap-3 mb-2" data-tour="reservations-conflicts-heading">
                  <h3 className="text-gray-900">
                    Reservas do dia {selectedDay ? new Date(selectedDay).toLocaleDateString('pt-BR') : '-'}
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openModuleTutorial('reservations-conflicts-flow', { trackProgress: false })}
                    className="text-indigo-600 hover:text-indigo-700"
                  >
                    Tutorial rápido
                  </Button>
                </div>
                <div className="relative" data-tour="reservations-filters">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar ponto, cliente, proposta..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto" data-tour="reservations-conflicts">
                {dayReservations.length > 0 ? (
                  dayReservations.map((reservation) => {
                    const amount = estimateReservationAmount(reservation);
                    return (
                      <ReservationDayCard
                        key={reservation.id}
                        reservation={{ ...reservation, estimatedAmount: amount }}
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
                    {isTutorialMode ? (
                      <p className="mt-2 text-xs text-indigo-600">
                        No tutorial, exemplos de conflito aparecem automaticamente quando necessário.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
