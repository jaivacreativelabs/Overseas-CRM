import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, CheckCircle2, Home, Shield, MapPin } from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';

export const TravelPage: React.FC = () => {
  const [travelRecords, setTravelRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();
  const navigate = useNavigate();

  const fetchTravel = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any[]>('/leads', { limit: 50 });
      const allTravel: any[] = [];
      for (const lead of res.data || []) {
        const trData = await apiClient.get<any>(`/travel/lead/${lead._id}`).catch(() => ({ data: null }));
        if (trData.data) {
          allTravel.push({ ...trData.data, studentName: lead.name, leadId: lead._id, stage: lead.stage });
        }
      }
      setTravelRecords(allTravel);
    } catch (err: any) {
      error(err.message || 'Failed to load travel records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTravel();
  }, []);

  const handleRecordDeparture = async (leadId: string) => {
    try {
      await apiClient.post(`/travel/lead/${leadId}/departure`, {
        departureDate: new Date().toISOString(),
      });
      success('Student departure recorded!');
      fetchTravel();
    } catch (err: any) {
      error(err.message || 'Failed to record departure');
    }
  };

  const handleRecordArrival = async (leadId: string) => {
    try {
      await apiClient.post(`/travel/lead/${leadId}/arrival`, {
        arrivalDate: new Date().toISOString(),
      });
      success('Student arrival confirmed in destination country!');
      fetchTravel();
    } catch (err: any) {
      error(err.message || 'Failed to record arrival');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Pre-Departure, Travel & Arrival Operations
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Verify 3-point travel requirements (Accommodation, Flight, Insurance) and track student departures & arrivals.
        </p>
      </div>

      <Table
        columns={[
          {
            header: 'STUDENT NAME',
            render: (t) => (
              <div
                style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                onClick={() => navigate(`/students/${t.leadId}`)}
              >
                {t.studentName}
              </div>
            ),
          },
          {
            header: 'ACCOMMODATION',
            render: (t) => (
              <Badge variant={t.accommodationStatus === 'COMPLETED' ? 'success' : 'neutral'}>
                {t.accommodationStatus || 'PENDING'}
              </Badge>
            ),
          },
          {
            header: 'FLIGHT TICKET',
            render: (t) => (
              <Badge variant={t.flightStatus === 'COMPLETED' ? 'success' : 'neutral'}>
                {t.flightStatus || 'PENDING'}
              </Badge>
            ),
          },
          {
            header: 'HEALTH INSURANCE',
            render: (t) => (
              <Badge variant={t.insuranceStatus === 'COMPLETED' ? 'success' : 'neutral'}>
                {t.insuranceStatus || 'PENDING'}
              </Badge>
            ),
          },
          {
            header: 'CURRENT STAGE',
            render: (t) => <Badge variant="primary">{t.stage?.replace(/_/g, ' ')}</Badge>,
          },
          {
            header: 'ACTIONS',
            align: 'right',
            render: (t) => (
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                {!t.studentDeparted ? (
                  <Button variant="secondary" size="sm" onClick={() => handleRecordDeparture(t.leadId)}>
                    Departed
                  </Button>
                ) : !t.arrivalConfirmed ? (
                  <Button variant="primary" size="sm" onClick={() => handleRecordArrival(t.leadId)}>
                    Confirm Arrival
                  </Button>
                ) : (
                  <Badge variant="success">✓ Arrived</Badge>
                )}
              </div>
            ),
          },
        ]}
        data={travelRecords}
        loading={loading}
        emptyMessage="No travel support records active."
      />
    </div>
  );
};
