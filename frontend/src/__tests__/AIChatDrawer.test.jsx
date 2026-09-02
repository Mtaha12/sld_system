import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AIChatDrawer from '../features/dashboard/components/AIChatDrawer';
import { aiChatService } from '../services/aiChatService';
import { caseService } from '../features/cases/services/caseService';

// Mock the AI Service
vi.mock('../services/aiChatService', () => ({
  aiChatService: {
    createSession: vi.fn(),
    sendMessage: vi.fn(),
    getSession: vi.fn(),
  }
}));

// Mock Case Service
vi.mock('../features/cases/services/caseService', () => ({
  caseService: {
    getCaseById: vi.fn(),
  }
}));

describe('AIChatDrawer Component - Global Case Context', () => {
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <AIChatDrawer isOpen={true} onClose={onCloseMock} />
      </BrowserRouter>
    );
  };

  it('renders chatbot UI correctly without case context initially', () => {
    renderComponent();
    expect(screen.getByText('Super Law AI Assistant')).toBeDefined();
    expect(screen.getByText('How can I help you today?')).toBeDefined();
    
    // Input is enabled
    const input = screen.getByPlaceholderText('Ask about any case by providing its SLD number...');
    expect(input.disabled).toBe(false);
  });

  it('prompts for case number if none is provided and no session exists', async () => {
    renderComponent();
    
    const input = screen.getByPlaceholderText('Ask about any case by providing its SLD number...');
    fireEvent.change(input, { target: { value: 'What happened in the previous hearing?' } });
    fireEvent.click(input.nextElementSibling);

    await waitFor(() => {
      expect(screen.getByText('Please provide the SLD/case number you want me to analyze.')).toBeDefined();
    });
    
    expect(aiChatService.createSession).not.toHaveBeenCalled();
    expect(aiChatService.sendMessage).not.toHaveBeenCalled();
  });

  it('creates session and sends message when valid SLD number is detected', async () => {
    caseService.getCaseById.mockResolvedValueOnce({ sldNumber: '1629482' });
    aiChatService.createSession.mockResolvedValueOnce({ id: 'session-1' });
    aiChatService.sendMessage.mockResolvedValueOnce({
      session_id: 'session-1',
      answer: 'This is the AI response about 1629482',
      sources: []
    });

    renderComponent();

    const input = screen.getByPlaceholderText('Ask about any case by providing its SLD number...');
    fireEvent.change(input, { target: { value: 'What is happening in case 1629482?' } });
    fireEvent.click(input.nextElementSibling);

    await waitFor(() => {
      expect(caseService.getCaseById).toHaveBeenCalledWith('1629482');
      expect(aiChatService.createSession).toHaveBeenCalledWith('1629482');
      expect(aiChatService.sendMessage).toHaveBeenCalledWith('session-1', 'What is happening in case 1629482?');
      expect(screen.getByText('This is the AI response about 1629482')).toBeDefined();
    });
  });

  it('handles invalid case numbers safely', async () => {
    caseService.getCaseById.mockRejectedValueOnce(new Error('Not found'));

    renderComponent();

    const input = screen.getByPlaceholderText('Ask about any case by providing its SLD number...');
    fireEvent.change(input, { target: { value: 'What is happening in case 1234567?' } });
    fireEvent.click(input.nextElementSibling);

    await waitFor(() => {
      expect(screen.getByText('Case 1234567 could not be found in the available records.')).toBeDefined();
    });
    
    expect(aiChatService.createSession).not.toHaveBeenCalled();
  });

  it('uses active case context for follow-up questions', async () => {
    // 1. Initial valid case
    caseService.getCaseById.mockResolvedValueOnce({ sldNumber: '1629482' });
    aiChatService.createSession.mockResolvedValueOnce({ id: 'session-1' });
    aiChatService.sendMessage.mockResolvedValueOnce({
      session_id: 'session-1',
      answer: 'Initial response',
      sources: []
    });

    renderComponent();

    const input = screen.getByPlaceholderText('Ask about any case by providing its SLD number...');
    fireEvent.change(input, { target: { value: 'Tell me about 1629482' } });
    fireEvent.click(input.nextElementSibling);

    await waitFor(() => {
      expect(aiChatService.sendMessage).toHaveBeenCalledWith('session-1', 'Tell me about 1629482');
    });

    // 2. Follow-up without case number
    aiChatService.sendMessage.mockResolvedValueOnce({
      session_id: 'session-1',
      answer: 'Follow-up response',
      sources: []
    });

    fireEvent.change(input, { target: { value: 'What did the judge decide?' } });
    fireEvent.click(input.nextElementSibling);

    await waitFor(() => {
      expect(aiChatService.sendMessage).toHaveBeenCalledWith('session-1', 'What did the judge decide?');
      // Did NOT create a new session
      expect(aiChatService.createSession).toHaveBeenCalledTimes(1);
    });
  });

  it('switches to a new case and creates a new session', async () => {
    // 1. Initial valid case
    caseService.getCaseById.mockResolvedValueOnce({ sldNumber: '1629482' });
    aiChatService.createSession.mockResolvedValueOnce({ id: 'session-1' });
    aiChatService.sendMessage.mockResolvedValueOnce({
      session_id: 'session-1',
      answer: 'Response 1',
      sources: []
    });

    renderComponent();

    const input = screen.getByPlaceholderText('Ask about any case by providing its SLD number...');
    fireEvent.change(input, { target: { value: 'Tell me about 1629482' } });
    fireEvent.click(input.nextElementSibling);

    await waitFor(() => {
      expect(aiChatService.sendMessage).toHaveBeenCalledWith('session-1', 'Tell me about 1629482');
    });

    // 2. Switch to new case
    caseService.getCaseById.mockResolvedValueOnce({ sldNumber: '1720000' });
    aiChatService.createSession.mockResolvedValueOnce({ id: 'session-2' });
    aiChatService.sendMessage.mockResolvedValueOnce({
      session_id: 'session-2',
      answer: 'Response 2',
      sources: []
    });

    fireEvent.change(input, { target: { value: 'Now tell me about case 1720000' } });
    fireEvent.click(input.nextElementSibling);

    await waitFor(() => {
      expect(caseService.getCaseById).toHaveBeenCalledWith('1720000');
      expect(aiChatService.createSession).toHaveBeenCalledWith('1720000');
      expect(aiChatService.sendMessage).toHaveBeenCalledWith('session-2', 'Now tell me about case 1720000');
      
      // System message
      expect(screen.getByText('[Switched context to case 1720000]')).toBeDefined();
    });
  });
});
