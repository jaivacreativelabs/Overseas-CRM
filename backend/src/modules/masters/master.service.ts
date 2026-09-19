import { MasterItemModel, IMasterItem } from './master.model';

export class MasterService {
  static async getMastersByType(type: string): Promise<any[]> {
    return MasterItemModel.find({ type, isActive: true }).sort({ order: 1, label: 1 }).lean();
  }

  static async getAllMasters(): Promise<Record<string, any[]>> {
    const items = await MasterItemModel.find({ isActive: true }).sort({ order: 1, label: 1 }).lean();
    const grouped: Record<string, any[]> = {
      LEAD_SOURCE: [],
      LEAD_STATUS: [],
      CLOSED_LOST_REASON: [],
      INTAKE: [],
      DOCUMENT_TYPE: [],
    };

    items.forEach((item) => {
      if (grouped[item.type]) {
        grouped[item.type].push(item);
      }
    });

    return grouped;
  }

  static async createMasterItem(data: {
    type: 'LEAD_SOURCE' | 'LEAD_STATUS' | 'CLOSED_LOST_REASON' | 'INTAKE' | 'DOCUMENT_TYPE';
    key: string;
    label: string;
    description?: string;
    order?: number;
  }): Promise<IMasterItem> {
    return MasterItemModel.create(data);
  }
}
