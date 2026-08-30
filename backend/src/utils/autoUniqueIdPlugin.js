import { generateUniqueId, DEFAULT_ENTITY_CONFIGS } from './uniqueIdGenerator.js';

/**
 * Mongoose Plugin for Auto-Generating Concurrency-Safe Unique IDs
 *
 * @param {import('mongoose').Schema} schema
 * @param {Object} options
 * @param {string} options.entityName - Entity identifier (e.g. 'case', 'notification', 'statute', 'user')
 * @param {string} [options.field] - Primary field name on document (default: camelCase derived from config)
 * @param {string[]} [options.aliases] - Additional field aliases (e.g. ['case_id'])
 * @param {string} [options.prefix] - Prefix (e.g. 'CASE')
 * @param {number} [options.padLength=6] - Number of zero-padded digits
 * @param {string} [options.delimiter='-'] - Separator
 */
export const autoUniqueIdPlugin = (schema, options = {}) => {
  const entityName = (options.entityName || 'default').toLowerCase().trim();
  const defaultConfig = DEFAULT_ENTITY_CONFIGS[entityName] || DEFAULT_ENTITY_CONFIGS.default;

  const primaryField = options.field || defaultConfig.field || 'recordId';
  const aliases = options.aliases || defaultConfig.aliases || [];
  const prefix = options.prefix !== undefined ? options.prefix : defaultConfig.prefix;
  const padLength = options.padLength || defaultConfig.padLength || 6;
  const delimiter = options.delimiter || '-';

  // 1. Add primary ID field to schema if not already explicitly defined
  const schemaPathObj = {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true
  };

  if (!schema.path(primaryField)) {
    schema.add({ [primaryField]: schemaPathObj });
  }

  // 2. Add alias fields (e.g., snake_case case_id) if not defined
  for (const alias of aliases) {
    if (!schema.path(alias)) {
      schema.add({ [alias]: schemaPathObj });
    }
  }

  // 3. Pre-save hook: Automatically generate unique ID on document creation
  schema.pre('save', async function () {
    // Only generate if ID is missing or document is new
    if (this.isNew || !this[primaryField]) {
      if (!this[primaryField]) {
        const session = this.$session ? this.$session() : null;
        const generatedId = await generateUniqueId({
          entityName,
          prefix,
          padLength,
          delimiter,
          session
        });

        this[primaryField] = generatedId;

        // Populate aliases identically
        for (const alias of aliases) {
          this[alias] = generatedId;
        }
      } else {
        // If primaryField was already manually supplied, keep aliases synced
        for (const alias of aliases) {
          if (!this[alias]) {
            this[alias] = this[primaryField];
          }
        }
      }
    }
  });

  // 4. Static helper attached directly to Model: Model.generateNextId()
  schema.statics.generateNextId = async function (session = null) {
    return generateUniqueId({
      entityName,
      prefix,
      padLength,
      delimiter,
      session
    });
  };
};

export default autoUniqueIdPlugin;
