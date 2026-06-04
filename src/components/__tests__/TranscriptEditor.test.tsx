import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TranscriptEditor from '../TranscriptEditor';

const mockTranscript = {
  id: 1,
  text: 'This is a simulated transcript of your audio file.',
  filename: 'test-audio.mp3',
  createdAt: new Date('2026-06-04T17:27:00.000Z'),
};

const mockOnSave = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TranscriptEditor', () => {
  it('renders the transcript text in a textarea', () => {
    render(<TranscriptEditor transcript={mockTranscript} onSave={mockOnSave} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue(mockTranscript.text);
  });

  it('displays the filename', () => {
    render(<TranscriptEditor transcript={mockTranscript} onSave={mockOnSave} />);

    expect(screen.getByText(mockTranscript.filename)).toBeInTheDocument();
  });

  it('allows editing the transcript text', async () => {
    const user = userEvent.setup();
    render(<TranscriptEditor transcript={mockTranscript} onSave={mockOnSave} />);

    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'Edited transcript text.');

    expect(textarea).toHaveValue('Edited transcript text.');
  });

  it('calls onSave with the updated text when Save button is clicked', async () => {
    const user = userEvent.setup();
    render(<TranscriptEditor transcript={mockTranscript} onSave={mockOnSave} />);

    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'Updated transcript content.');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith('Updated transcript content.');
  });

  it('does not call onSave if text is unchanged', async () => {
    const user = userEvent.setup();
    render(<TranscriptEditor transcript={mockTranscript} onSave={mockOnSave} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('disables the Save button when text is unchanged', () => {
    render(<TranscriptEditor transcript={mockTranscript} onSave={mockOnSave} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it('enables the Save button when text is changed', async () => {
    const user = userEvent.setup();
    render(<TranscriptEditor transcript={mockTranscript} onSave={mockOnSave} />);

    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'Changed text.');

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeEnabled();
  });

  it('shows a loading state when saving', async () => {
    const mockAsyncSave = jest.fn().mockImplementation(() => new Promise<void>((resolve) => setTimeout(resolve, 100)));
    const user = userEvent.setup();
    render(<TranscriptEditor transcript={mockTranscript} onSave={mockAsyncSave} />);

    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'New text.');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(screen.getByText(/saving/i)).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.queryByText(/saving/i)).not.toBeInTheDocument();
    });
  });

  it('handles null transcript gracefully', () => {
    render(<TranscriptEditor transcript={null} onSave={mockOnSave} />);

    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.queryByText(mockTranscript.filename)).not.toBeInTheDocument();
  });

  it('handles undefined transcript gracefully', () => {
    render(<TranscriptEditor transcript={undefined} onSave={mockOnSave} />);

    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('displays error message when onSave fails', async () => {
    const mockErrorSave = jest.fn().mockRejectedValue(new Error('Save failed'));
    const user = userEvent.setup();
    render(<TranscriptEditor transcript={mockTranscript} onSave={mockErrorSave} />);

    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'New text.');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/save failed/i)).toBeInTheDocument();
    });
  });
});