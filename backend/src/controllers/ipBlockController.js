import IpBlock from '../models/IpBlock.js';
import logger from '../utils/logger.js';

const INITIAL_IP_BLOCKS = [
  { ipAddress: '182.184.254.151', userName: 'Unregistered Crawler', cityName: 'Bannu', dated: new Date('2026-07-28T15:36:44Z') },
  { ipAddress: '39.48.33.24', userName: 'Suspicious Bot', cityName: 'Karachi', dated: new Date('2026-07-28T15:26:26Z') },
  { ipAddress: '111.92.140.2', userName: 'Abusive Requester', cityName: 'Lahore', dated: new Date('2026-07-28T15:10:12Z') },
];

export const getIpBlocks = async (req, res, next) => {
  try {
    const { search } = req.query;

    const count = await IpBlock.countDocuments();
    if (count === 0) {
      await IpBlock.insertMany(INITIAL_IP_BLOCKS);
    }

    const query = { status: 'blocked' };
    if (search && search.trim()) {
      const s = search.trim();
      const sRegex = new RegExp(s, 'i');
      query.$or = [
        { ipAddress: sRegex },
        { userName: sRegex },
        { cityName: sRegex },
      ];
    }

    const blocks = await IpBlock.find(query).sort({ dated: -1, createdAt: -1 });
    return res.status(200).json({
      success: true,
      total: blocks.length,
      data: blocks
    });
  } catch (error) {
    next(error);
  }
};

export const createIpBlock = async (req, res, next) => {
  try {
    const { ipAddress, userName, cityName, reason } = req.body;
    if (!ipAddress || !ipAddress.trim()) {
      return res.status(400).json({ success: false, message: 'IP Address is required.' });
    }

    const cleanIp = ipAddress.trim();
    const existing = await IpBlock.findOne({ ipAddress: cleanIp });
    if (existing) {
      if (existing.status === 'blocked') {
        return res.status(400).json({ success: false, message: 'This IP address is already blocked.' });
      }
      existing.status = 'blocked';
      existing.userName = userName ? userName.trim() : existing.userName;
      existing.cityName = cityName ? cityName.trim() : existing.cityName;
      existing.dated = new Date();
      await existing.save();
      return res.status(200).json({ success: true, message: 'IP re-blocked successfully', data: existing });
    }

    const block = await IpBlock.create({
      ipAddress: cleanIp,
      userName: userName ? userName.trim() : '',
      cityName: cityName ? cityName.trim() : '',
      reason: reason ? reason.trim() : 'Manual block by Admin',
      status: 'blocked',
      dated: new Date(),
    });

    logger.info(`[IP Blocked] Admin added IP: ${cleanIp} to block list.`);
    return res.status(201).json({
      success: true,
      message: 'IP Address added to Block List successfully',
      data: block
    });
  } catch (error) {
    next(error);
  }
};

export const deleteIpBlock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const block = await IpBlock.findByIdAndDelete(id);
    if (!block) {
      return res.status(404).json({ success: false, message: 'Blocked IP record not found' });
    }
    logger.info(`[IP Unblocked] Admin removed IP ${block.ipAddress} from block list.`);
    return res.status(200).json({
      success: true,
      message: `IP ${block.ipAddress} unblocked successfully`,
      data: { id }
    });
  } catch (error) {
    next(error);
  }
};
