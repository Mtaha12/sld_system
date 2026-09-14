import City from '../models/City.js';
import PrincipleOfLaw from '../models/PrincipleOfLaw.js';
import LawSetting from '../models/LawSetting.js';

// Predefined Provinces in Pakistan
export const PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Azad Jammu and Kashmir',
  'Gilgit-Baltistan',
];

// Initial Pakistan cities with province mappings
const INITIAL_CITIES = [
  { name: 'Burewala', province: 'Punjab' },
  { name: 'Gujar Khan', province: 'Punjab' },
  { name: 'Alipur', province: 'Punjab' },
  { name: 'Balochistan', province: 'Balochistan' },
  { name: 'Neelum', province: 'Azad Jammu and Kashmir' },
  { name: 'Bagh', province: 'Azad Jammu and Kashmir' },
  { name: 'Muzaffarabad', province: 'Azad Jammu and Kashmir' },
  { name: 'Mirpur', province: 'Azad Jammu and Kashmir' },
  { name: 'Sudhnati', province: 'Azad Jammu and Kashmir' },
  { name: 'Kotli', province: 'Azad Jammu and Kashmir' },
  { name: 'Rawalakot', province: 'Azad Jammu and Kashmir' },
  { name: 'Hattian Bala', province: 'Azad Jammu and Kashmir' },
  { name: 'Haveli', province: 'Azad Jammu and Kashmir' },
  { name: 'Bhimber', province: 'Azad Jammu and Kashmir' },
  { name: 'Karachi', province: 'Sindh' },
  { name: 'Lahore', province: 'Punjab' },
  { name: 'Islamabad', province: 'Islamabad Capital Territory' },
  { name: 'Faisalabad', province: 'Punjab' },
  { name: 'Rawalpindi', province: 'Punjab' },
  { name: 'Multan', province: 'Punjab' },
  { name: 'Peshawar', province: 'Khyber Pakhtunkhwa' },
  { name: 'Quetta', province: 'Balochistan' },
  { name: 'Gujranwala', province: 'Punjab' },
  { name: 'Sialkot', province: 'Punjab' },
  { name: 'Hyderabad', province: 'Sindh' },
  { name: 'Bahawalpur', province: 'Punjab' },
  { name: 'Sargodha', province: 'Punjab' },
  { name: 'Sukkur', province: 'Sindh' },
  { name: 'Larkana', province: 'Sindh' },
  { name: 'Sheikhupura', province: 'Punjab' },
  { name: 'Rahim Yar Khan', province: 'Punjab' },
  { name: 'Jhang', province: 'Punjab' },
  { name: 'Dera Ghazi Khan', province: 'Punjab' },
  { name: 'Gujrat', province: 'Punjab' },
  { name: 'Sahiwal', province: 'Punjab' },
  { name: 'Wah Cantonment', province: 'Punjab' },
  { name: 'Mardan', province: 'Khyber Pakhtunkhwa' },
  { name: 'Kasur', province: 'Punjab' },
  { name: 'Okara', province: 'Punjab' },
  { name: 'Mingora', province: 'Khyber Pakhtunkhwa' },
  { name: 'Nawabshah', province: 'Sindh' },
  { name: 'Chiniot', province: 'Punjab' },
  { name: 'Kotri', province: 'Sindh' },
  { name: 'Kamoke', province: 'Punjab' },
  { name: 'Hafizabad', province: 'Punjab' },
  { name: 'Sadiqabad', province: 'Punjab' },
  { name: 'Mirpur Khas', province: 'Sindh' },
  { name: 'Kohat', province: 'Khyber Pakhtunkhwa' },
  { name: 'Khanewal', province: 'Punjab' },
  { name: 'Dera Ismail Khan', province: 'Khyber Pakhtunkhwa' },
  { name: 'Turbat', province: 'Balochistan' },
  { name: 'Muzaffargarh', province: 'Punjab' },
  { name: 'Abbottabad', province: 'Khyber Pakhtunkhwa' },
  { name: 'Mandi Bahauddin', province: 'Punjab' },
  { name: 'Shikarpur', province: 'Sindh' },
  { name: 'Jacobabad', province: 'Sindh' },
  { name: 'Jhelum', province: 'Punjab' },
  { name: 'Khanpur', province: 'Punjab' },
  { name: 'Khairpur', province: 'Sindh' },
  { name: 'Khuzdar', province: 'Balochistan' },
  { name: 'Pakpattan', province: 'Punjab' },
  { name: 'Hub', province: 'Balochistan' },
  { name: 'Daska', province: 'Punjab' },
  { name: 'Gojra', province: 'Punjab' },
  { name: 'Dadu', province: 'Sindh' },
  { name: 'Muridke', province: 'Punjab' },
  { name: 'Bahawalnagar', province: 'Punjab' },
  { name: 'Samundri', province: 'Punjab' },
  { name: 'Tando Allahyar', province: 'Sindh' },
  { name: 'Tando Adam', province: 'Sindh' },
  { name: 'Jaranwala', province: 'Punjab' },
  { name: 'Chishtian', province: 'Punjab' },
  { name: 'Attock', province: 'Punjab' },
  { name: 'Vehari', province: 'Punjab' },
  { name: 'Kot Abdul Malik', province: 'Punjab' },
  { name: 'Ferozwala', province: 'Punjab' },
  { name: 'Chakwal', province: 'Punjab' },
  { name: 'Gujranwala Cantonment', province: 'Punjab' },
  { name: 'Kamalia', province: 'Punjab' },
  { name: 'Umerkot', province: 'Sindh' },
  { name: 'Ahmedpur East', province: 'Punjab' },
  { name: 'Kot Addu', province: 'Punjab' },
  { name: 'Wazirabad', province: 'Punjab' },
  { name: 'Mansehra', province: 'Khyber Pakhtunkhwa' },
  { name: 'Layyah', province: 'Punjab' },
  { name: 'Swabi', province: 'Khyber Pakhtunkhwa' },
  { name: 'Chaman', province: 'Balochistan' },
  { name: 'Taxila', province: 'Punjab' },
  { name: 'Nowshera', province: 'Khyber Pakhtunkhwa' },
  { name: 'Khushab', province: 'Punjab' },
  { name: 'Shahdadkot', province: 'Sindh' },
  { name: 'Mianwali', province: 'Punjab' },
  { name: 'Kabal', province: 'Khyber Pakhtunkhwa' },
  { name: 'Lodhran', province: 'Punjab' },
  { name: 'Hasilpur', province: 'Punjab' },
  { name: 'Charsadda', province: 'Khyber Pakhtunkhwa' },
  { name: 'Bhakkar', province: 'Punjab' },
  { name: 'Badin', province: 'Sindh' },
  { name: 'Arifwala', province: 'Punjab' },
  { name: 'Ghotki', province: 'Sindh' },
  { name: 'Sambrial', province: 'Punjab' },
  { name: 'Jatoi', province: 'Punjab' },
  { name: 'Haroonabad', province: 'Punjab' },
  { name: 'Daharki', province: 'Sindh' },
  { name: 'Narowal', province: 'Punjab' },
  { name: 'Tando Muhammad Khan', province: 'Sindh' },
  { name: 'Kamber Ali Khan', province: 'Sindh' },
  { name: 'Mirpur Mathelo', province: 'Sindh' },
  { name: 'Kandhkot', province: 'Sindh' },
  { name: 'Bhalwal', province: 'Punjab' },
  { name: 'Gwadar', province: 'Balochistan' },
  { name: 'Pattoki', province: 'Punjab' },
  { name: 'Haripur', province: 'Khyber Pakhtunkhwa' },
  { name: 'Shahdadpur', province: 'Sindh' },
  { name: 'Moro', province: 'Sindh' },
  { name: 'Mian Channu', province: 'Punjab' },
  { name: 'Kharian', province: 'Punjab' },
  { name: 'Pano Akil', province: 'Sindh' },
  { name: 'Shorkot', province: 'Punjab' },
  { name: 'Pasrur', province: 'Punjab' },
  { name: 'Dipalpur', province: 'Punjab' },
  { name: 'Fateh Jang', province: 'Punjab' },
  { name: 'Gilgit', province: 'Gilgit-Baltistan' },
  { name: 'Skardu', province: 'Gilgit-Baltistan' },
  { name: 'Hunza', province: 'Gilgit-Baltistan' },
  { name: 'Ghanche', province: 'Gilgit-Baltistan' },
  { name: 'Diamer', province: 'Gilgit-Baltistan' },
  { name: 'Astore', province: 'Gilgit-Baltistan' },
  { name: 'Ghizer', province: 'Gilgit-Baltistan' },
  { name: 'Nagar', province: 'Gilgit-Baltistan' },
  { name: 'Shigar', province: 'Gilgit-Baltistan' },
  { name: 'Kharmang', province: 'Gilgit-Baltistan' },
  { name: 'Zhob', province: 'Balochistan' },
  { name: 'Sibi', province: 'Balochistan' },
  { name: 'Loralai', province: 'Balochistan' },
  { name: 'Kharan', province: 'Balochistan' },
  { name: 'Dera Murad Jamali', province: 'Balochistan' },
  { name: 'Dera Allah Yar', province: 'Balochistan' },
  { name: 'Usta Mohammad', province: 'Balochistan' },
  { name: 'Ziarat', province: 'Balochistan' },
  { name: 'Pishin', province: 'Balochistan' },
  { name: 'Nushki', province: 'Balochistan' }
];

const INITIAL_PRINCIPLES = [
  { name: 'Zamindar meaning and status under agricultural income tax' },
  { name: 'Year, meaning of under fiscal statutes' },
  { name: 'Year of taxability of dividend income' },
  { name: 'Year means period of twelve months preceding the relevant previous year, and not period of twelve months ending on 31st December' },
  { name: 'Refund is an Amanah and cannot be refused on grounds of limitation' },
  { name: 'Tax authority must pass individualized speaking and reasoned orders' },
  { name: 'Interpretation of taxing statutes strict construction rule applies' },
  { name: 'No tax without clear authority of law Article 77 of Constitution' },
  { name: 'Right of appeal is a substantive statutory right not procedural' },
  { name: 'Natural justice audi alteram partem mandatory prior to adverse order' },
  { name: 'Exemption clauses in fiscal legislation to be construed strictly' },
  { name: 'Burden of proof on revenue authority alleging suppression of sales' }
];

const INITIAL_LAWS = [
  { name: 'Sindh Sales Tax Special Procedure (Services provided or rendered by cab aggregator and the services provided or rendered by the owners or drivers of the motor vehicles)', ordering: 130, court: 'Sindh High Court' },
  { name: 'Income Tax Ordinance, 2001', ordering: 1, court: 'Supreme Court of Pakistan' },
  { name: 'Sales Tax Act, 1990', ordering: 2, court: 'Supreme Court of Pakistan' },
  { name: 'Customs Act, 1969', ordering: 3, court: 'High Court of Sindh' },
  { name: 'Federal Excise Act, 2005', ordering: 4, court: 'Lahore High Court' },
  { name: 'Income Tax Rules, 2002', ordering: 5, court: 'Appellate Tribunal Inland Revenue' },
  { name: 'Sales Tax Rules, 2006', ordering: 6, court: 'Appellate Tribunal Inland Revenue' },
  { name: 'Punjab Sales Tax on Services Act, 2012', ordering: 7, court: 'Lahore High Court' },
  { name: 'Sindh Sales Tax on Services Act, 2011', ordering: 8, court: 'High Court of Sindh' },
  { name: 'Tax Laws (Amendment) Ordinance, 2025', ordering: 9, court: 'Federal' },
  { name: 'Stamp (Amendment) Ordinance, 2026', ordering: 50, court: 'Provincial' }
];

/**
 * Seed initial records if collections are empty
 */
export const seedInitialSettingsData = async () => {
  try {
    const cityCount = await City.countDocuments();
    if (cityCount === 0) {
      await City.insertMany(INITIAL_CITIES.map(c => ({ ...c, status: 'active' })));
    }

    const principleCount = await PrincipleOfLaw.countDocuments();
    if (principleCount === 0) {
      await PrincipleOfLaw.insertMany(INITIAL_PRINCIPLES.map(p => ({ ...p, status: 'active' })));
    }

    const lawCount = await LawSetting.countDocuments();
    if (lawCount === 0) {
      await LawSetting.insertMany(INITIAL_LAWS.map(l => ({ ...l, date: new Date(), status: 'active' })));
    }
  } catch (err) {
    console.error('Settings auto-seeding notice:', err.message);
  }
};

// Trigger auto-seed on module import
seedInitialSettingsData();

// ==========================================
// 1. CITIES CONTROLLER
// ==========================================

export const getCities = async (req, res, next) => {
  try {
    const { search = '', province = '', status = '', page, limit } = req.query;

    const filter = {};
    if (search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }
    if (province.trim() && province !== 'All' && province !== 'all') {
      filter.province = province.trim();
    }
    if (status.trim() && status !== 'All' && status !== 'all') {
      filter.status = status.trim().toLowerCase();
    }

    const total = await City.countDocuments(filter);

    let query = City.find(filter).sort({ name: 1 });

    // Only paginate if page is explicitly provided
    if (page && limit) {
      const p = Math.max(1, parseInt(page, 10) || 1);
      const l = Math.max(1, parseInt(limit, 10) || 20);
      query = query.skip((p - 1) * l).limit(l);
    }

    const cities = await query;

    return res.status(200).json({
      success: true,
      total,
      data: cities,
    });
  } catch (err) {
    next(err);
  }
};

export const createCity = async (req, res, next) => {
  try {
    const { name, province, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'City Name is required.' });
    }
    if (!province || !province.trim()) {
      return res.status(400).json({ success: false, message: 'Province is required.' });
    }

    const existing = await City.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (existing) {
      return res.status(400).json({ success: false, message: `City "${name.trim()}" already exists.` });
    }

    const city = await City.create({
      name: name.trim(),
      province: province.trim(),
      status: status === 'inactive' ? 'inactive' : 'active',
    });

    return res.status(201).json({
      success: true,
      message: 'City created successfully',
      data: city,
    });
  } catch (err) {
    next(err);
  }
};

export const updateCity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, province, status } = req.body;

    const city = await City.findById(id);
    if (!city) {
      return res.status(404).json({ success: false, message: 'City not found' });
    }

    if (name && name.trim()) {
      const existing = await City.findOne({ 
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
        _id: { $ne: id }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: `City "${name.trim()}" already exists.` });
      }
      city.name = name.trim();
    }

    if (province && province.trim()) {
      city.province = province.trim();
    }
    if (status) {
      city.status = status === 'inactive' ? 'inactive' : 'active';
    }

    await city.save();

    return res.status(200).json({
      success: true,
      message: 'City updated successfully',
      data: city,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const city = await City.findByIdAndDelete(id);
    if (!city) {
      return res.status(404).json({ success: false, message: 'City not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'City deleted successfully',
      data: { id },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 2. PRINCIPLE OF LAWS CONTROLLER
// ==========================================

export const getPrinciples = async (req, res, next) => {
  try {
    const { search = '', status = '', page, limit } = req.query;

    const filter = {};
    if (search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }
    if (status.trim() && status !== 'All' && status !== 'all') {
      filter.status = status.trim().toLowerCase();
    }

    const total = await PrincipleOfLaw.countDocuments(filter);
    let query = PrincipleOfLaw.find(filter).sort({ name: 1 });

    if (page && limit) {
      const p = Math.max(1, parseInt(page, 10) || 1);
      const l = Math.max(1, parseInt(limit, 10) || 20);
      query = query.skip((p - 1) * l).limit(l);
    }

    const principles = await query;

    return res.status(200).json({
      success: true,
      total,
      data: principles,
    });
  } catch (err) {
    next(err);
  }
};

export const createPrinciple = async (req, res, next) => {
  try {
    const { name, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Law / Principle Name is required.' });
    }

    const existing = await PrincipleOfLaw.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'This Principle of Law already exists.' });
    }

    const principle = await PrincipleOfLaw.create({
      name: name.trim(),
      status: status === 'inactive' ? 'inactive' : 'active',
    });

    return res.status(201).json({
      success: true,
      message: 'Principle of Law created successfully',
      data: principle,
    });
  } catch (err) {
    next(err);
  }
};

export const updatePrinciple = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const principle = await PrincipleOfLaw.findById(id);
    if (!principle) {
      return res.status(404).json({ success: false, message: 'Principle of Law not found' });
    }

    if (name && name.trim()) {
      const existing = await PrincipleOfLaw.findOne({ 
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
        _id: { $ne: id }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'This Principle of Law already exists.' });
      }
      principle.name = name.trim();
    }

    if (status) {
      principle.status = status === 'inactive' ? 'inactive' : 'active';
    }

    await principle.save();

    return res.status(200).json({
      success: true,
      message: 'Principle of Law updated successfully',
      data: principle,
    });
  } catch (err) {
    next(err);
  }
};

export const deletePrinciple = async (req, res, next) => {
  try {
    const { id } = req.params;
    const principle = await PrincipleOfLaw.findByIdAndDelete(id);
    if (!principle) {
      return res.status(404).json({ success: false, message: 'Principle of Law not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Principle of Law deleted successfully',
      data: { id },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 3. LAWS / STATUTES CONTROLLER
// ==========================================

export const getLaws = async (req, res, next) => {
  try {
    const { search = '', court = '', status = '', page, limit } = req.query;

    const filter = {};
    if (search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }
    if (court.trim() && court !== 'All' && court !== 'all') {
      filter.court = { $regex: court.trim(), $options: 'i' };
    }
    if (status.trim() && status !== 'All' && status !== 'all') {
      filter.status = status.trim().toLowerCase();
    }

    const total = await LawSetting.countDocuments(filter);
    let query = LawSetting.find(filter).sort({ ordering: 1, name: 1 });

    if (page && limit) {
      const p = Math.max(1, parseInt(page, 10) || 1);
      const l = Math.max(1, parseInt(limit, 10) || 20);
      query = query.skip((p - 1) * l).limit(l);
    }

    const laws = await query;

    return res.status(200).json({
      success: true,
      total,
      data: laws,
    });
  } catch (err) {
    next(err);
  }
};

export const createLaw = async (req, res, next) => {
  try {
    const { name, ordering, date, court, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Law / Statute Name is required.' });
    }

    const existing = await LawSetting.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'This Law / Statute already exists.' });
    }

    const law = await LawSetting.create({
      name: name.trim(),
      ordering: Number(ordering) || 1,
      date: date ? new Date(date) : new Date(),
      court: court ? court.trim() : '',
      status: status === 'inactive' ? 'inactive' : 'active',
    });

    return res.status(201).json({
      success: true,
      message: 'Law / Statute created successfully',
      data: law,
    });
  } catch (err) {
    next(err);
  }
};

export const updateLaw = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, ordering, date, court, status } = req.body;

    const law = await LawSetting.findById(id);
    if (!law) {
      return res.status(404).json({ success: false, message: 'Law / Statute not found' });
    }

    if (name && name.trim()) {
      const existing = await LawSetting.findOne({ 
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
        _id: { $ne: id }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'This Law / Statute already exists.' });
      }
      law.name = name.trim();
    }

    if (ordering !== undefined) {
      law.ordering = Number(ordering) || 1;
    }
    if (date) {
      law.date = new Date(date);
    }
    if (court !== undefined) {
      law.court = court ? court.trim() : '';
    }
    if (status) {
      law.status = status === 'inactive' ? 'inactive' : 'active';
    }

    await law.save();

    return res.status(200).json({
      success: true,
      message: 'Law / Statute updated successfully',
      data: law,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteLaw = async (req, res, next) => {
  try {
    const { id } = req.params;
    const law = await LawSetting.findByIdAndDelete(id);
    if (!law) {
      return res.status(404).json({ success: false, message: 'Law / Statute not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Law / Statute deleted successfully',
      data: { id },
    });
  } catch (err) {
    next(err);
  }
};
