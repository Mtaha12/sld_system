import Case from '../models/Case.js';
import ReplacementLog from '../models/ReplacementLog.js';
import logger from '../utils/logger.js';

const escapeRegex = (string) => {
  if (string == null) return '';
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const executeReplacement = async (req, res, next) => {
  try {
    const { findText, replaceWith = '', fromId, toId, updateFor } = req.body;

    if (!findText || !findText.trim()) {
      return res.status(400).json({ success: false, message: '"Find" text is required.' });
    }
    if (!toId || !String(toId).trim()) {
      return res.status(400).json({ success: false, message: '"To ID" is required.' });
    }
    if (!updateFor || updateFor === 'Select') {
      return res.status(400).json({ success: false, message: '"Update For" target field must be selected.' });
    }

    const cleanFind = findText.trim();
    const cleanReplace = replaceWith != null ? String(replaceWith) : '';
    const findRegex = new RegExp(escapeRegex(cleanFind), 'gi');

    const fromNum = fromId ? parseInt(fromId.replace(/\D/g, ''), 10) : 0;
    const toNum = parseInt(String(toId).replace(/\D/g, ''), 10) || 99999999;

    // Build query to find matching cases within ID range
    const caseQuery = { isDeleted: { $ne: true } };

    // Select candidate cases
    const candidates = await Case.find(caseQuery).limit(5000);

    let affectedCount = 0;
    const modifiedCasesInfo = [];

    for (const c of candidates) {
      // Check numeric range by sldNumber or numeric portion of caseId
      const currentNum = parseInt(String(c.sldNumber || c.caseId || '').replace(/\D/g, ''), 10);
      if (!isNaN(currentNum) && (currentNum < fromNum || currentNum > toNum)) {
        continue;
      }

      let isModified = false;

      switch (updateFor) {
        case 'Head Note':
          if (c.headNote && findRegex.test(c.headNote)) {
            c.headNote = c.headNote.replace(findRegex, cleanReplace);
            isModified = true;
          }
          break;

        case 'Judgment':
          if (c.judgment && findRegex.test(c.judgment)) {
            c.judgment = c.judgment.replace(findRegex, cleanReplace);
            isModified = true;
          }
          break;

        case 'Judges':
          if (Array.isArray(c.judges)) {
            const newJudges = c.judges.map(j => {
              if (findRegex.test(j)) {
                isModified = true;
                return j.replace(findRegex, cleanReplace);
              }
              return j;
            });
            if (isModified) c.judges = newJudges;
          }
          break;

        case 'Petitioners':
          if (Array.isArray(c.petitioners)) {
            const newPet = c.petitioners.map(p => {
              if (findRegex.test(p)) {
                isModified = true;
                return p.replace(findRegex, cleanReplace);
              }
              return p;
            });
            if (isModified) c.petitioners = newPet;
          }
          break;

        case 'Case #':
          if (Array.isArray(c.caseNumber)) {
            const newNums = c.caseNumber.map(n => {
              if (findRegex.test(n)) {
                isModified = true;
                return n.replace(findRegex, cleanReplace);
              }
              return n;
            });
            if (isModified) c.caseNumber = newNums;
          }
          break;

        case 'Laws':
          if (Array.isArray(c.laws)) {
            c.laws.forEach(l => {
              if (l.lawStatute && findRegex.test(l.lawStatute)) {
                l.lawStatute = l.lawStatute.replace(findRegex, cleanReplace);
                isModified = true;
              }
            });
          }
          break;

        case 'References':
          if (c.references && findRegex.test(c.references)) {
            c.references = c.references.replace(findRegex, cleanReplace);
            isModified = true;
          }
          break;

        default:
          break;
      }

      if (isModified) {
        await c.save();
        affectedCount++;
        if (modifiedCasesInfo.length < 50) {
          modifiedCasesInfo.push({
            id: c.caseId,
            sldNumber: c.sldNumber,
            field: updateFor
          });
        }
      }
    }

    // Record in replacement log
    const log = await ReplacementLog.create({
      findText: cleanFind,
      replaceWith: cleanReplace,
      fromId: fromId || '1',
      toId: String(toId),
      updateFor,
      affectedCasesCount: affectedCount,
      executedBy: req.user?.username || 'Admin',
      dated: new Date(),
    });

    logger.info(`[Batch Replacement] Replaced "${cleanFind}" with "${cleanReplace}" in field ${updateFor}. Affected ${affectedCount} cases.`);

    return res.status(200).json({
      success: true,
      message: affectedCount > 0 
        ? `Replacement complete! Successfully updated ${affectedCount} case record(s).`
        : `No matching occurrences of "${cleanFind}" found in field "${updateFor}" within ID range ${fromId || 1} to ${toId}.`,
      affectedCasesCount: affectedCount,
      log,
      sampleModified: modifiedCasesInfo
    });
  } catch (error) {
    next(error);
  }
};

export const getReplacementHistory = async (req, res, next) => {
  try {
    const history = await ReplacementLog.find().sort({ dated: -1 }).limit(100);
    return res.status(200).json({
      success: true,
      total: history.length,
      data: history
    });
  } catch (error) {
    next(error);
  }
};
