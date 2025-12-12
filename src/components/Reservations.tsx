import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Reservation, ReservationStatus, MediaUnit, MediaPoint, Proposal } from '../types';
import { useReservations } from '../hooks/useReservations';
import { ReservationDayCard } from './reservations/ReservationDayCard';
import { ReservationDetailsDrawer } from './reservations/ReservationDetailsDrawer';
import { toast } from 'sonner';
import apiClient from '../lib/apiClient';

const CURRENT_COMPANY_ID = 'c1'; // TODO: Pegar do contexto de autenticação

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
    setSelectedDay(null); // Limpar dia selecionado ao trocar de mês
  };

  const nextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
    setSelectedDay(null);
  };

  // Hook de reservas
  const startDateISO = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
  const endDateISO = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString();
  const { reservations, loading, error, refetch, createReservation, updateReservation, deleteReservation } = useReservations({
    startDate: startDateISO,
    endDate: endDateISO,
    status: statusFilter === 'ALL' ? undefined : (statusFilter as ReservationStatus | string),
  });

  // Agrupar por dia
  const daysWithReservations = useMemo(() => {
    const set = new Set<number>();
    reservations.forEach((res) => {
      const d = new Date(res.startDate).getDate();
      set.add(d);
    });
    return set;
  }, [reservations]);

  const monthSummary = useMemo(() => {
    const active = reservations.filter((r) => r.status !== ReservationStatus.CANCELADA).length;
    const confirmed = reservations.filter((r) => r.status === ReservationStatus.CONFIRMADA).length;
    const totalAmount = 0; // TODO: calcular via ProposalItem quando disponível
    return { activeCount: active, confirmedCount: confirmed, totalAmount };
  }, [reservations]);

  // Reservas do dia selecionado
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

    // Aplicar filtro de busca simples por IDs (placeholder até dados enriquecidos)
    if (!searchTerm) return list;
    const searchLower = searchTerm.toLowerCase();
    return list.filter((res) =>
      res.mediaUnitId?.toLowerCase().includes(searchLower) ||
      res.campaignId?.toLowerCase().includes(searchLower) ||
      res.proposalId?.toLowerCase().includes(searchLower)
    );
  }, [selectedDay, reservations, searchTerm]);

  // Enrichment caches
  const [unitMap, setUnitMap] = useState<Record<string, MediaUnit>>({});
  const [pointMap, setPointMap] = useState<Record<string, MediaPoint>>({});
  const [proposalMap, setProposalMap] = useState<Record<string, Proposal>>({});

  // Fetch missing enrichment when dayReservations change
  useEffect(() => {
    const fetchEnrichment = async () => {
      const unitIds = Array.from(
        new Set(
          dayReservations
            .map((r) => r.mediaUnitId)
            .filter((id): id is string => !!id && !(id in unitMap))
        )
      );
      const proposalIds = Array.from(
        new Set(
          dayReservations
            .map((r) => r.proposalId)
            .filter((id): id is string => !!id && !(id in proposalMap))
        )
      );

      // Fetch units and points
      const fetchedUnits: MediaUnit[] = [];
      for (const id of unitIds) {
        try {
          const res = await apiClient.get<MediaUnit>(`/media-units/${id}`);
          fetchedUnits.push(res.data);
        } catch (e) {
          // ignore
        }
      }
      if (fetchedUnits.length) {
        setUnitMap((prev) => {
          const next = { ...prev };
          fetchedUnits.forEach((u) => {
            next[u.id] = u;
          });
          return next;
        });
        // fetch points for these units
        const pointIds = Array.from(
          new Set(
            fetchedUnits
              .map((u) => u.mediaPointId)
              .filter((id): id is string => !!id && !(id in pointMap))
          )
        );
        const fetchedPoints: MediaPoint[] = [];
        for (const pid of pointIds) {
          try {
            const res = await apiClient.get<MediaPoint>(`/media-points/${pid}`);
            fetchedPoints.push(res.data);
          } catch (e) {
            // ignore
          }
        }
        if (fetchedPoints.length) {
          setPointMap((prev) => {
            const next = { ...prev };
            fetchedPoints.forEach((p) => {
              next[p.id] = p;
            });
            return next;
          });
        }
      }

      // Fetch proposals
      const fetchedProposals: Proposal[] = [];
      for (const pid of proposalIds) {
        try {
          const res = await apiClient.get<Proposal>(`/proposals/${pid}`);
          fetchedProposals.push(res.data);
        } catch (e) {
          // ignore
        }
      }
      if (fetchedProposals.length) {
        setProposalMap((prev) => {
          const next = { ...prev };
          fetchedProposals.forEach((p) => {
            next[p.id] = p;
          });
          return next;
        });
      }
    };

    fetchEnrichment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayReservations]);

  // Contar reservas do dia selecionado (sem filtro de status)
  const selectedDayCount = useMemo(() => {
    if (!selectedDay) return 0;
    return dayReservations.filter((res) => res.status !== ReservationStatus.CANCELADA).length;
  }, [selectedDay, dayReservations]);

  // Handlers
  const handleCreateReservationForDay = async (payload: Partial<Reservation>) => {
    try {
      // align period to selectedDay if not provided
      const baseStart = selectedDay ? new Date(selectedDay) : new Date();
      const baseEnd = selectedDay ? new Date(selectedDay) : new Date();
      baseEnd.setHours(23, 59, 59, 999);
      const finalPayload = {
        startDate: payload.startDate ?? baseStart.toISOString(),
        endDate: payload.endDate ?? baseEnd.toISOString(),
        status: payload.status ?? ReservationStatus.RESERVADA,
        mediaUnitId: payload.mediaUnitId,
        campaignId: payload.campaignId,
        proposalId: payload.proposalId,
      };
      await createReservation(finalPayload);
      toast.success('Reserva criada com sucesso!');
      refetch();
    } catch {
      toast.error('Erro ao criar reserva');
    }
  };

  const handleUpdateReservation = async (id: string, payload: Partial<Reservation>) => {
    try {
      await updateReservation(id, payload);
      toast.success('Reserva atualizada com sucesso!');
      refetch();
    } catch {
      toast.error('Erro ao atualizar reserva');
    }
  };

  const handleDeleteReservation = async (id: string) => {
    try {
      await deleteReservation(id);
      toast.success('Reserva excluída com sucesso!');
      refetch();
    } catch {
      toast.error('Erro ao excluir reserva');
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Agenda OOH (Reservation)</h1>
        <p className="text-gray-600">
          Visualize e gerencie reservas de mídia OOH por MediaUnit
        </p>
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
            <p className="text-gray-600 text-sm mb-1">Valor Total do Mês</p>
            <p className="text-gray-900">
              R${' '}
              {monthSummary.totalAmount.toLocaleString('pt-BR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </p>
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
                  const dayDate = new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth(),
                    day
                  );
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
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'hover:bg-gray-100 text-gray-900'
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
                  Reservas do dia{' '}
                  {selectedDay ? new Date(selectedDay).toLocaleDateString('pt-BR') : '-'}
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar ponto ou cliente..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {dayReservations.length > 0 ? (
                  dayReservations.map((reservation) => (
                    <ReservationDayCard
                      key={reservation.id}
                      reservation={reservation}
                      clientName={(() => {
                        const p = reservation.proposalId ? proposalMap[reservation.proposalId] : undefined;
                        const c = p?.client;
                        return c?.companyName || c?.contactName;
                      })()}
                      unitLabel={(() => {
                        const u = reservation.mediaUnitId ? unitMap[reservation.mediaUnitId] : undefined;
                        return u?.label;
                      })()}
                      pointName={(() => {
                        const u = reservation.mediaUnitId ? unitMap[reservation.mediaUnitId] : undefined;
                        const pt = u?.mediaPointId ? pointMap[u.mediaPointId] : undefined;
                        return pt?.name;
                      })()}
                      amount={undefined /* TODO: calcular via ProposalItem */}
                      onClick={() => setDetailsDrawerReservation(reservation)}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {selectedDay
                        ? 'Nenhuma reserva OOH neste dia'
                        : 'Selecione um dia no calendário'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Info das Regras */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-900 mb-2">💡 Regras de Reservas</p>
        <p className="text-sm text-blue-700">
          <strong>OOH:</strong> Não permite sobreposição de datas para a mesma MediaUnit (validação backend).
          <br />
          <strong>DOOH:</strong> Permite múltiplas reservas simultâneas (várias campanhas no mesmo painel digital).
          <br />
          Esta tela exibe apenas reservas de mídia <strong>OOH</strong> (faces estáticas).
        </p>
      </div>

      {/* Drawer de Detalhes */}
      <ReservationDetailsDrawer
        open={!!detailsDrawerReservation}
        onOpenChange={(open: boolean) => !open && setDetailsDrawerReservation(null)}
        reservation={detailsDrawerReservation}
        clientName={(() => {
          const p = detailsDrawerReservation?.proposalId ? proposalMap[detailsDrawerReservation.proposalId] : undefined;
          const c = p?.client;
          return c?.companyName || c?.contactName;
        })()}
        unitLabel={(() => {
          const u = detailsDrawerReservation?.mediaUnitId ? unitMap[detailsDrawerReservation.mediaUnitId] : undefined;
          return u?.label;
        })()}
        pointName={(() => {
          const u = detailsDrawerReservation?.mediaUnitId ? unitMap[detailsDrawerReservation.mediaUnitId] : undefined;
          const pt = u?.mediaPointId ? pointMap[u.mediaPointId] : undefined;
          return pt?.name;
        })()}
        amount={undefined /* TODO: calcular via ProposalItem */}
        onUpdateReservation={handleUpdateReservation}
        onDeleteReservation={handleDeleteReservation}
      />
    </div>
  );
}