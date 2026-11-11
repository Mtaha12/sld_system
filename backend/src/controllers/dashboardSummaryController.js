import Case from '../models/Case.js';
import Statute from '../models/Statute.js';
import Notification from '../models/Notification.js';
import Dictionary from '../models/Dictionary.js';
import OtherCaseLaw from '../models/OtherCaseLaw.js';
import TaxCard from '../models/TaxCard.js';
import WebsiteUpdate from '../models/WebsiteUpdate.js';
import News from '../models/News.js';
import WhatsappUpdate from '../models/WhatsappUpdate.js';
import YoutubeUpdate from '../models/YoutubeUpdate.js';
import Counter from '../models/Counter.js';
import sharedApiCache from '../utils/memoryCache.js';

const BASE_SUMMARY_CACHE_KEY = 'dashboard:public_base_v1';
const AUTH_EXTRAS_CACHE_KEY = 'dashboard:auth_extras_v1';
const SUMMARY_TTL_MS = 90 * 1000; // 90s keeps dashboard instant & responsive to edits

const toPreviewList = (docs, mapper) => (Array.isArray(docs) ? docs.map(mapper) : []);

/**
 * Fetches all shared public non-confidential showcase previews + O(1) counts in one parallel round-trip.
 * Never touches TaxCard, User, UserActivity, or judgment/block HTML bodies.
 */
async function getOrBuildBaseSummary() {
  const cached = sharedApiCache.get(BASE_SUMMARY_CACHE_KEY);
  if (cached) return cached;

  const [
    counters,
    caseEstCount,
    otherCaseEstCount,
    statuteEstCount,
    notifEstCount,
    dictEstCount,
    maxDictDoc,
    statutes,
    notifications,
    dictionary,
    otherCases,
    updates,
    news,
    whatsappPublic,
    youtube,
  ] = await Promise.all([
    Counter.find({
      _id: {
        $in: [
          'case_citation_stats_v1',
          'dashboard_statute_baseline_v1',
          'dashboard_notification_baseline_v1',
        ],
      },
    }).lean(),
    Case.estimatedDocumentCount().catch(() => 0),
    OtherCaseLaw.estimatedDocumentCount().catch(() => 0),
    Statute.estimatedDocumentCount().catch(() => 0),
    Notification.estimatedDocumentCount().catch(() => 0),
    Dictionary.estimatedDocumentCount().catch(() => 0),
    Dictionary.findOne({}).sort({ srNumber: -1 }).select('srNumber').lean(),
    Statute.find({})
      .sort({ srNumberInt: -1, createdAt: -1 })
      .limit(5)
      .select('statuteId srNumber chapter law section heading')
      .lean(),
    Notification.find({})
      .sort({ srNumberInt: -1, createdAt: -1 })
      .limit(5)
      .select('notificationId srNumber sroNumber subject number year')
      .lean(),
    Dictionary.find({})
      .sort({ srNumber: 1, _id: 1 })
      .limit(5)
      .select('dictionaryId srNumber words meaning')
      .lean(),
    OtherCaseLaw.find({})
      .sort({ srNumber: -1, createdAt: -1 })
      .limit(5)
      .select('otherCaseId srNumber caseNo citation parties')
      .lean(),
    WebsiteUpdate.find({})
      .sort({ dated: -1, createdAt: -1 })
      .limit(6)
      .select('updateId srNumber heading dated url')
      .lean(),
    News.find({})
      .sort({ srNumber: -1, createdAt: -1 })
      .limit(5)
      .select('newsId srNumber heading date year category')
      .lean(),
    WhatsappUpdate.find({})
      .sort({ dated: -1, srNumber: -1, createdAt: -1 })
      .limit(6)
      .select('whatsappId srNumber heading dated')
      .lean(),
    YoutubeUpdate.find({})
      .sort({ dated: -1, createdAt: -1 })
      .limit(6)
      .select('youtubeId srNumber caption dated url photo')
      .lean(),
  ]);

  const counterMap = new Map(counters.map((c) => [c._id, Number(c.seq) || 0]));
  const citationBase = counterMap.get('case_citation_stats_v1') || caseEstCount || 0;
  const totalCitations = Math.max(citationBase, caseEstCount) + otherCaseEstCount;

  const statuteBaseline = counterMap.has('dashboard_statute_baseline_v1')
    ? counterMap.get('dashboard_statute_baseline_v1')
    : statuteEstCount;
  const statutesTotal = 3000 + Math.max(0, statuteEstCount - statuteBaseline);

  const notifBaseline = counterMap.has('dashboard_notification_baseline_v1')
    ? counterMap.get('dashboard_notification_baseline_v1')
    : notifEstCount;
  const notificationsTotal = 30000 + Math.max(0, notifEstCount - notifBaseline);

  const dictionaryTotal = Number(maxDictDoc?.srNumber) || dictEstCount || 41427;

  const payload = {
    counts: {
      citations: totalCitations,
      statutes: statutesTotal,
      notifications: notificationsTotal,
      dictionary: dictionaryTotal,
      otherCaseLaws: otherCaseEstCount,
    },
    statutes: toPreviewList(statutes, (s) => ({
      _id: s._id,
      id: s._id,
      statuteId: s.statuteId,
      srNumber: s.srNumber,
      law: s.law || '',
      section: s.section || '',
      heading: s.heading || '',
    })),
    notifications: toPreviewList(notifications, (n) => ({
      _id: n._id,
      id: n._id,
      notificationId: n.notificationId,
      srNumber: n.srNumber,
      sroNumber: n.sroNumber || '',
      subject: n.subject || '',
      number: n.number || '',
      year: n.year || '',
    })),
    dictionary: toPreviewList(dictionary, (d) => ({
      _id: d._id,
      id: d._id,
      dictionaryId: d.dictionaryId,
      srNumber: d.srNumber,
      words: d.words || '',
      meaning: typeof d.meaning === 'string' ? d.meaning.slice(0, 90) : '',
    })),
    otherCases: toPreviewList(otherCases, (c) => ({
      _id: c._id,
      mongoId: c._id,
      id: c.otherCaseId || c._id,
      otherCaseId: c.otherCaseId,
      srNumber: c.srNumber,
      caseNo: c.caseNo || '',
      citation: c.citation || '',
      parties: c.parties || '',
    })),
    updates: toPreviewList(updates, (u) => ({
      _id: u._id,
      id: u._id,
      updateId: u.updateId,
      srNumber: u.srNumber,
      heading: u.heading || '',
      dated: u.dated || '',
      url: u.url || '',
    })),
    news: toPreviewList(news, (n) => ({
      _id: n._id,
      mongoId: n._id,
      id: n.newsId || n.srNumber || n._id,
      newsId: n.newsId,
      srNumber: n.srNumber,
      heading: n.heading || '',
      date: n.date || '',
      year: n.year || '',
      category: n.category || '',
    })),
    whatsappPublic: toPreviewList(whatsappPublic, (w) => ({
      _id: w._id,
      id: w._id,
      whatsappId: w.whatsappId,
      srNumber: w.srNumber,
      heading: w.heading || '',
      dated: w.dated || '',
    })),
    youtube: toPreviewList(youtube, (y) => ({
      _id: y._id,
      id: y._id,
      youtubeId: y.youtubeId,
      srNumber: y.srNumber,
      caption: y.caption || '',
      dated: y.dated || '',
      url: y.url || '',
      photo: y.photo || '',
    })),
  };

  return sharedApiCache.set(BASE_SUMMARY_CACHE_KEY, payload, SUMMARY_TTL_MS);
}

/**
 * Fetches authenticated-only dashboard additions (Tax Cards preview + WhatsApp attachment metadata).
 */
async function getOrBuildAuthExtras() {
  const cached = sharedApiCache.get(AUTH_EXTRAS_CACHE_KEY);
  if (cached) return cached;

  const [taxCardsCount, taxCards, whatsappUpdates] = await Promise.all([
    TaxCard.countDocuments({ isDeleted: { $ne: true } }),
    TaxCard.find({ isDeleted: { $ne: true } })
      .sort({ srNumber: -1, createdAt: -1 })
      .limit(5)
      .select('taxCardId srNumber heading category date year')
      .lean(),
    WhatsappUpdate.find({})
      .sort({ dated: -1, srNumber: -1, createdAt: -1 })
      .limit(6)
      .select('whatsappId srNumber heading dated attachmentName')
      .lean(),
  ]);

  const payload = {
    taxCardsCount,
    taxCards: toPreviewList(taxCards, (t) => ({
      _id: t._id,
      id: t._id,
      taxCardId: t.taxCardId,
      srNumber: t.srNumber,
      heading: t.heading || '',
      category: t.category || '',
      date: t.date || '',
      year: t.year || '',
    })),
    whatsappUpdates: toPreviewList(whatsappUpdates, (w) => ({
      _id: w._id,
      id: w._id,
      whatsappId: w.whatsappId,
      srNumber: w.srNumber,
      heading: w.heading || '',
      dated: w.dated || '',
      attachmentName: w.attachmentName || '',
    })),
  };

  return sharedApiCache.set(AUTH_EXTRAS_CACHE_KEY, payload, SUMMARY_TTL_MS);
}

/**
 * GET /api/dashboard/public
 * Rate-limited public landing endpoint. Excludes Tax Cards, Users, Activities, and private attachments.
 */
export const getPublicDashboard = async (req, res, next) => {
  try {
    const base = await getOrBuildBaseSummary();
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    return res.status(200).json({
      success: true,
      isPublic: true,
      data: {
        counts: base.counts,
        statutes: base.statutes,
        notifications: base.notifications,
        dictionary: base.dictionary,
        otherCases: base.otherCases,
        taxCardsCount: 0,
        taxCards: [],
        updates: base.updates,
        news: base.news,
        whatsappUpdates: base.whatsappPublic,
        youtube: base.youtube,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dashboard/summary
 * Authenticated dashboard payload with role/permission scoping.
 */
export const getAuthenticatedDashboard = async (req, res, next) => {
  try {
    const [base, extras] = await Promise.all([
      getOrBuildBaseSummary(),
      getOrBuildAuthExtras(),
    ]);

    const isAdmin = req.user?.role === 'Administrator';
    const canViewCases = isAdmin || (req.user?.displayCase !== false && req.user?.isSpammer !== true);
    const canViewStatutes = isAdmin || req.user?.displayStatute !== false;
    const canViewNotifications = isAdmin || req.user?.displayNotification !== false;

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      success: true,
      isPublic: false,
      data: {
        counts: {
          ...base.counts,
          taxCards: extras.taxCardsCount,
        },
        statutes: canViewStatutes ? base.statutes : [],
        notifications: canViewNotifications ? base.notifications : [],
        dictionary: base.dictionary,
        otherCases: canViewCases ? base.otherCases : [],
        taxCardsCount: extras.taxCardsCount,
        taxCards: extras.taxCards,
        updates: base.updates,
        news: base.news,
        whatsappUpdates: extras.whatsappUpdates,
        youtube: base.youtube,
      },
    });
  } catch (err) {
    next(err);
  }
};

