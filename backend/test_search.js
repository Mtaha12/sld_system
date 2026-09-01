import mongoose from 'mongoose';
import { searchCases } from './src/controllers/caseController.js';

const mockReq = {
  body: {
    yearVolume: "2025",
    magazine: "",
    page: "",
    selectLaw: "Income Tax (Amendment) Bill, 2025",
    section: "",
    section2: "",
    court: "",
    caseNumber: "",
    date: null,
    keywords: "",
    keywords2: "",
    phrase: "",
    judges: "",
    lawyers: "",
    petitioner: "",
    principleLaw: ""
  }
};

const mockRes = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    console.log('Status:', this.statusCode);
    console.log('Data:', JSON.stringify(data, null, 2));
  }
};

const mockNext = (err) => {
  console.log('Next called with error:', err);
};

// We don't even need to connect to DB to see if the query builder crashes.
// But it will crash on Case.find() if no DB connection.
// Let's mock Case.find().
import Case from './src/models/Case.js';
Case.find = function(query) {
  console.log('Query built:', JSON.stringify(query, null, 2));
  return {
    sort: function() {
      return {
        limit: function() {
          return Promise.resolve([]);
        }
      }
    }
  }
};

searchCases(mockReq, mockRes, mockNext);
