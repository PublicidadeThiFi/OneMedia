import { useState, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Reservation, ReservationStatus, MediaType } from '../types';
import {
  getReservationsForMonth,
  getReservationsForDay,
  getReservationSummaryForMonth,
  getDaysWithReservations,
  getMediaUnitById,
  getMediaPointByMediaUnit,
  getClientById,
  getProposalById,
} from '../lib/mockData';
import { ReservationDayCard } from './reservations/ReservationDayCard';
import { ReservationDetailsDrawer } from './reservations/ReservationDetailsDrawer';

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

  // Buscar reservas do mês e estatísticas
  const monthReservations = useMemo(
    () => getReservationsForMonth(CURRENT_COMPANY_ID, currentMonth),
    [currentMonth]
  );

  const monthSummary = useMemo(
    () => getReservationSummaryForMonth(CURRENT_COMPANY_ID, currentMonth),
    [currentMonth]
  );

  const daysWithReservations = useMemo(
    () => getDaysWithReservations(CURRENT_COMPANY_ID, currentMonth),
    [currentMonth]
  );

  // Reservas do dia selecionado
  const dayReservations = useMemo(() => {
    if (!selectedDay) return [];

    const reservations = getReservationsForDay(
      CURRENT_COMPANY_ID,
      selectedDay,
      statusFilter === 'ALL' ? undefined : statusFilter
    );

    // Filtrar apenas OOH
    const oohReservations = reservations.filter((res) => {
      const unit = getMediaUnitById(res.mediaUnitId);
      if (!unit) return false;
      const point = getMediaPointByMediaUnit(unit.id);
      return point?.type === MediaType.OOH;
    });

    // Aplicar filtro de busca
    if (!searchTerm) return oohReservations;

    const searchLower = searchTerm.toLowerCase();
    return oohReservations.filter((res) => {
      const unit = getMediaUnitById(res.mediaUnitId);
      const point = unit ? getMediaPointByMediaUnit(unit.id) : undefined;
      const proposal = res.proposalId ? getProposalById(res.proposalId) : undefined;
      const client = proposal ? getClientById(proposal.clientId) : undefined;

      return (
        client?.companyName?.toLowerCase().includes(searchLower) ||
        client?.contactName?.toLowerCase().includes(searchLower) ||
        point?.name?.toLowerCase().includes(searchLower) ||
        point?.addressCity?.toLowerCase().includes(searchLower) ||
        point?.addressDistrict?.toLowerCase().includes(searchLower)
      );
    });
  }, [selectedDay, statusFilter, searchTerm]);

  // Contar reservas do dia selecionado (sem filtro de status)
  const selectedDayCount = useMemo(() => {
    if (!selectedDay) return 0;
    const allReservations = getReservationsForDay(CURRENT_COMPANY_ID, selectedDay, undefined);
    // Filtrar apenas OOH e excluir canceladas
    return allReservations.filter((res) => {
      if (res.status === ReservationStatus.CANCELADA) return false;
      const unit = getMediaUnitById(res.mediaUnitId);
      if (!unit) return false;
      const point = getMediaPointByMediaUnit(unit.id);
      return point?.type === MediaType.OOH;
    }).length;
  }, [selectedDay]);

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
                  onValueChange={(value) => setStatusFilter(value as ReservationStatus | 'ALL')}
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
        onOpenChange={(open) => !open && setDetailsDrawerReservation(null)}
        reservation={detailsDrawerReservation}
      />
    </div>
  );
}