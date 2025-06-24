// web/src/app/ai-pet-care/page.tsx
"use client";

import React, { useState } from 'react';
import { gql, useLazyQuery } from '@apollo/client';
import Layout from '@/components/Layout';
import AppProviders from '@/components/AppProviders'; // For Apollo Client context
import styles from './AIPetCare.module.css'; // Create this CSS module

// Define GraphQL query
const GET_PET_CARE_ADVICE_QUERY = gql`
  query GetPetCareAdvice($question: String!) {
    getPetCareAdvice(question: $question)
  }
`;

const AIPetCarePageContent: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [advice, setAdvice] = useState<string | null>(null);

  const [getAdvice, { loading, error, /* data */ }] = useLazyQuery(GET_PET_CARE_ADVICE_QUERY, { // data was unused
    onCompleted: (queryData) => {
      setAdvice(queryData.getPetCareAdvice);
    },
    onError: (queryError) => {
      // The resolver should append the disclaimer to the error message already
      setAdvice(`Error: ${queryError.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setAdvice("Please enter a question before asking for advice.");
      return;
    }
    setAdvice(null); // Clear previous advice
    getAdvice({ variables: { question } });
  };

  // For displaying multiline advice with proper formatting
  const formatAdvice = (text: string | null) => {
    if (!text) return null;
    // Split by newline, then map to <p> or <br />. Handle bolding for disclaimer.
    return text.split('\n').map((paragraph, index) => {
        if (paragraph.startsWith('---')) { // Disclaimer separator
            return <hr key={`hr-${index}`} className={styles.disclaimerSeparator} />;
        }
        if (paragraph.startsWith('**Disclaimer:**')) {
            return <p key={index} className={styles.disclaimerText}><strong>Disclaimer:</strong>{paragraph.substring('**Disclaimer:**'.length)}</p>;
        }
        return <p key={index}>{paragraph}</p>;
    });
  };


  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.pageTitle}>🐾 PawsAI Pet Care Advisor</h1>
      <p className={styles.pageSubtitle}>
        Ask a question about general pet care, and PawsAI will try to help!
      </p>

      <form onSubmit={handleSubmit} className={styles.questionForm}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., How often should I walk my dog?"
          className={styles.questionTextarea}
          rows={3}
        />
        <button type="submit" disabled={loading} className={styles.submitButton}>
          {loading ? 'Thinking...' : 'Get Advice'}
        </button>
      </form>

      {loading && <p className={styles.loadingText}>PawsAI is pondering your question...</p>}

      {advice && (
        <div className={styles.adviceContainer}>
          <h3 className={styles.adviceTitle}>PawsAI Says:</h3>
          <div className={styles.adviceText}>{formatAdvice(advice)}</div>
        </div>
      )}
       {/* Display direct error from hook if advice isn't set by onError (fallback) */}
      {error && !advice && (
         <div className={styles.adviceContainer}>
            <h3 className={styles.adviceTitle} style={{color: 'var(--error-color)'}}>Error:</h3>
            <div className={styles.adviceText} style={{color: 'var(--error-color)'}}>{error.message}</div>
        </div>
      )}
    </div>
  );
};

const AIPetCarePage = () => {
  return (
    <AppProviders>
      <Layout>
        <AIPetCarePageContent />
      </Layout>
    </AppProviders>
  );
};

export default AIPetCarePage;
