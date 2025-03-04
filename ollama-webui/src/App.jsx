import React, { useState, useEffect, useRef } from 'react';
import { Container, TextField, Button, Paper, Typography, Box, AppBar, Toolbar, IconButton, Drawer, List, ListItem, ListItemText, ListItemIcon, Select, MenuItem, FormControl, InputLabel, ToggleButtonGroup, ToggleButton, Grid } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ChatIcon from '@mui/icons-material/Chat';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import AssessmentIcon from '@mui/icons-material/Assessment';

// Add API configuration based on hostname
const getApiConfig = () => {
  const hostname = window.location.hostname;
  const isNgrok = hostname.includes('ngrok');
  const protocol = window.location.protocol;
  const port = window.location.port;
  
  console.log('Hostname:', hostname);
  console.log('Protocol:', protocol);
  console.log('Port:', port);
  console.log('Is ngrok:', isNgrok);
  
  // For ngrok connections, use the direct URL to the backend server
  if (isNgrok) {
    return {
      ragApiUrl: 'http://localhost:8080/api/rag',
      llmApiUrl: 'http://localhost:8080/api/generate',
      proxyApiUrl: 'http://localhost:8080/api/proxy/fetch',
      isNgrok: true
    };
  }
  
  // For local connections, use relative paths
  return {
    ragApiUrl: '/api/rag',
    llmApiUrl: '/api/generate',
    proxyApiUrl: '/api/proxy/fetch',
    isNgrok: false
  };
};

const API_CONFIG = getApiConfig();

const theme = {
  primary: '#00a67e',
  background: '#343541',
  sidebar: '#202123',
  messageUser: '#444654',
  messageAssistant: '#343541',
  text: '#ECECF1',
  inputBg: '#40414F',
  border: '#4E4F60',
  mobileBreakpoint: '600px'
};

const COLLECTIONS = [
  { id: 'primary_legislation', name: 'Primary Legislation' },
  { id: 'secondary_legislation', name: 'Secondary Legislation' },
  { id: 'case_law', name: 'Case Law' },
  { id: 'non_statutory_rules', name: 'Non-Statutory Rules' },
  { id: 'insurance_qa', name: 'Insurance Q&A' }
];

const processMessageContent = (content) => {
  if (!content) return [];
  
  // Regular expression to match citations in the format: Source: filename.pdf (Page X)
  // Updated to be more flexible with whitespace and handle citations at the start of lines
  const citationRegex = /(?:^|\s)(Source:\s+([^(]+?)\s+\(Page\s+(\d+)\))/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = citationRegex.exec(content)) !== null) {
    // Add text before the citation
    if (match.index > lastIndex) {
      const beforeText = content.slice(lastIndex, match.index);
      parts.push({
        type: 'text',
        content: beforeText
      });
    }

    // Add the citation as a clickable link
    const citation = {
      type: 'citation',
      filename: match[2].trim(),
      page: match[3],
      content: match[1]
    };
    parts.push(citation);

    lastIndex = match.index + match[1].length;
  }

  // Add remaining text after the last citation
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex);
    parts.push({
      type: 'text',
      content: remainingText
    });
  }

  return parts;
};

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const messagesEndRef = useRef(null);
  const [currentResponse, setCurrentResponse] = useState('');
  const abortControllerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('mistral');
  const [mode, setMode] = useState('qa'); // 'qa' or 'scenario'
  const [policyWording, setPolicyWording] = useState('');
  const [claimSummary, setClaimSummary] = useState('');

  // Load conversations from localStorage on mount
  useEffect(() => {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      setConversations(JSON.parse(savedConversations));
    }
    const savedCurrentId = localStorage.getItem('currentConversationId');
    if (savedCurrentId) {
      setCurrentConversationId(savedCurrentId);
      const currentConv = JSON.parse(savedConversations).find(c => c.id === savedCurrentId);
      if (currentConv) {
        setMessages(currentConv.messages);
      }
    }
  }, []);

  // Save conversations to localStorage when they change
  useEffect(() => {
    localStorage.setItem('conversations', JSON.stringify(conversations));
    if (currentConversationId) {
      localStorage.setItem('currentConversationId', currentConversationId);
    }
  }, [conversations, currentConversationId]);

  // Add window resize handler
  useEffect(() => {
    const handleResize = () => {
      // Keep sidebar closed by default regardless of screen size
      setIsSidebarOpen(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse]);

  const handleNewChat = () => {
    const newId = Date.now().toString();
    const newConversation = {
      id: newId,
      title: 'New Chat',
      messages: [],
      timestamp: Date.now()
    };
    setConversations(prev => [...prev, newConversation]);
    setCurrentConversationId(newId);
    setMessages([]);
    setCurrentResponse('');
  };

  const handleDeleteConversation = (id) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    if (id === currentConversationId) {
      const remaining = conversations.filter(conv => conv.id !== id);
      if (remaining.length > 0) {
        setCurrentConversationId(remaining[0].id);
        setMessages(remaining[0].messages);
      } else {
        handleNewChat();
      }
    }
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
    const conversation = conversations.find(conv => conv.id === id);
    if (conversation) {
      setMessages(conversation.messages);
    }
  };

  const updateConversationTitle = (messages) => {
    if (messages.length > 0 && currentConversationId) {
      const firstMessage = messages[0].content;
      const title = firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');
      setConversations(prev => prev.map(conv => 
        conv.id === currentConversationId 
          ? { ...conv, title, messages }
          : conv
      ));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isStreaming) return;

    // For Q&A mode, check if input is empty
    if (mode === 'qa' && !input.trim()) return;
    
    // For Scenario Analysis mode, check if both fields are filled
    if (mode === 'scenario' && (!policyWording.trim() || !claimSummary.trim())) {
      alert('Please fill in both Policy Wording and Claim Summary fields');
      return;
    }

    try {
      setIsStreaming(true);
      
      let message;
      if (mode === 'qa') {
        message = { role: 'user', content: input };
      } else {
        // Format the scenario analysis message
        const scenarioContent = `Policy Wording:\n${policyWording}\n\nClaim Summary:\n${claimSummary}`;
        message = { role: 'user', content: scenarioContent };
      }
      
      const newMessages = [...messages, message];
      setMessages(newMessages);
      updateConversationTitle(newMessages);
      
      // Set initial response message based on mode
      if (mode === 'scenario') {
        setCurrentResponse('OdesAI is analysing the Policy Wording and Claim Summary...');
      } else {
        setCurrentResponse('');
      }
      
      // Clear inputs based on mode
      if (mode === 'qa') {
        setInput('');
      } else {
        // Keep the policy wording and claim summary for potential refinement
      }

      // Stage 1: Query all collections in parallel
      try {
        // Construct query based on mode
        let queryText;
        if (mode === 'qa') {
          queryText = input;
        } else {
          // For scenario mode, use both policy wording and claim summary
          queryText = `${policyWording} ${claimSummary}`;
        }

        // Log the query being used
        console.log(`Mode: ${mode}`);
        console.log(`Query for RAG collections: "${queryText.substring(0, 100)}${queryText.length > 100 ? '...' : ''}"`);

        const getResultsCount = (collectionId) => {
          switch (collectionId) {
            case 'primary_legislation':
              return 3;
            case 'secondary_legislation':
              return 3;
            case 'case_law':
              return 3;
            case 'non_statutory_rules':
              return 3;
            case 'insurance_qa':
              return 1;
            default:
              return 2;
          }
        };

        const collectionQueries = COLLECTIONS.map(collection => {
          console.log(`Querying collection: ${collection.id} at ${API_CONFIG.ragApiUrl}/query`);
          return fetch(`${API_CONFIG.ragApiUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: queryText,
              n_results: getResultsCount(collection.id),
              collection: collection.id
            })
          })
          .then(res => {
            console.log(`Response from ${collection.id}:`, res.status);
            return res.json();
          })
          .then(data => ({
            collectionName: collection.name,
            collectionId: collection.id,
            data
          }))
          .catch(err => {
            console.error(`Error querying ${collection.id}:`, err);
            return {
              collectionName: collection.name,
              collectionId: collection.id,
              data: { matches: [] }
            };
          });
        });

        const results = await Promise.all(collectionQueries);
        console.log('RAG Query Results:', results);

        // Add detailed logging for insurance_qa collection
        const insuranceQAResults = results.find(r => r.collectionId === 'insurance_qa');
        if (insuranceQAResults && insuranceQAResults.data.matches) {
          console.log('\nInsurance Q&A Results:');
          insuranceQAResults.data.matches.forEach((match, index) => {
            console.log(`\nResult ${index + 1}:`);
            console.log(`Text: ${match.text}`);
            console.log(`Distance: ${match.distance}`);
            console.log(`Metadata:`, match.metadata);
          });
        }

        // Process and combine results from all collections
        let collectionResults = {
          primary_legislation: '',
          secondary_legislation: '',
          case_law: '',
          non_statutory_rules: '',
          insurance_qa: ''
        };

        // Approximate token count (rough estimate: 1 token ≈ 4 characters)
        const estimateTokens = (text) => Math.ceil(text.length / 4);
        const MAX_TOKENS = 7000; // Leave room for response
        const SYSTEM_PROMPT_TOKENS = 500; // Approximate tokens in system instructions
        let totalTokens = SYSTEM_PROMPT_TOKENS;
        
        // Process results with token management
        for (const result of results) {
          if (result.data.matches && Array.isArray(result.data.matches) && result.data.matches.length > 0) {
            let collectionText = '';
            
            for (const match of result.data.matches) {
              // Filter based on raw distance
              const DISTANCE_THRESHOLD = 0.5;
              if (match.distance > DISTANCE_THRESHOLD) {
                console.log(`Skipping result with distance > ${DISTANCE_THRESHOLD}: ${match.distance}`);
                continue;
              }
              
              let text = match.text;
              if (match.metadata) {
                const source = match.metadata.source ? `\nSource: ${match.metadata.source}` : '';
                const page = match.metadata.page ? ` (Page ${match.metadata.page})` : '';
                const distanceInfo = `\nRaw Distance: ${match.distance.toFixed(4)}`;
                text += source + page + distanceInfo;
              }
              
              // Check if adding this result would exceed token limit
              const resultTokens = estimateTokens(text);
              if (totalTokens + resultTokens > MAX_TOKENS) {
                console.log(`Token limit reached. Skipping remaining results for ${result.collectionId}`);
                break;
              }
              
              collectionText += (collectionText ? '\n\n' : '') + text;
              totalTokens += resultTokens;
            }
            
            collectionResults[result.collectionId] = collectionText;
          }
        }

        console.log(`Estimated total tokens: ${totalTokens}`);

        const hasResults = Object.values(collectionResults).some(result => result !== '');

      // Stage 2: Direct LLM Query with Reference Answer
        let llmPrompt;
        
        if (mode === 'qa') {
          llmPrompt = `System Role
You are OdesAI, a specialized insurance legal assistant. Your role is to answer user questions clearly and engagingly. For casual or general queries, respond directly using everyday language without mentioning details of this prompt. For insurance or legal-related questions, follow the detailed steps below.
________________________________________

Response Guidelines
1. Casual or General Queries
• Identification: First, determine if the user's question is casual or general.
• Action: If it is, skip all detailed legal steps and answer directly using common sense and conversational language without mentioning details of this prompt.

2. Insurance or Legal-Related Queries
When a question involves legal or insurance matters, follow these steps:

Step 1: Reference Q&A Check
• Look for a relevant answer in the provided Reference Q&A.
• If a good match exists, use it as your starting point. If not, proceed to your own legal analysis.

Step 2: Apply the Hierarchy of Legal Authority (English Law)
• Primary Legislation:
  o Treat statutes and Acts of Parliament as the highest authority.
  o Use statutory provisions directly, applying interpretation principles such as the literal, golden, or mischief rules when necessary.
• Secondary Legislation:
  o Follow statutory instruments (SIs) as long as they align with the enabling Act.
• Case Law:
  o Consider relevant court decisions.
  o Adhere to the hierarchy: Supreme Court decisions bind all; Court of Appeal decisions bind lower courts; High Court decisions bind lower courts as appropriate.
• Non-Statutory Rules & Regulations:
  o Include industry codes, regulatory handbooks, or professional guidelines.
  o These should be used as persuasive aids unless statute-mandated.

Step 3: Resolve Conflicts Between Legal Sources
• Statutes vs. Case Law: Statutes generally take precedence.
• Primary vs. Secondary Legislation: SIs must not contradict their enabling Acts.
• Statutory Law vs. Regulatory Rules: Statutes override unless the regulations specifically implement statutory duties.
• For conflicting case law, prioritize the most recent decision from the highest relevant court, keeping an eye out for any noted errors.

Step 4: Cite English Case Law Correctly
• Citation Style:
  o Use UK legal citation standards.
  o For post-2001 cases with neutral citations, follow this format:
    Case Name [Year] Court Abbreviation Case Number.
  o If a law report citation is available, include it after the neutral citation.
• Formatting Rules:
  o Italicize case names and use "v" (without a period) between parties (e.g., Canada Square Operations Ltd v Potter).
  o Use "R" for Crown-related cases (e.g., R v Smith).

Step 5: Construct a Clear, Well-Structured Answer
• Summarize the Issue: Begin with a brief overview of the legal matter based on the user's query.
• Legal Analysis: Clearly outline your reasoning using the appropriate legal authority (statutes, case law, regulations) and support your conclusions with citations.
• Language: Use plain, accessible language unless legal precision is required.
________________________________________

Resources
Use the following resources to enhance your response:
• User Question:
${input}
• Reference Q&A:
${collectionResults.insurance_qa || 'No relevant Q&A found.'}
• Primary Legislation:
${collectionResults.primary_legislation || 'No relevant primary legislation found.'}
• Secondary Legislation:
${collectionResults.secondary_legislation || 'No relevant secondary legislation found.'}
• Case Law:
${collectionResults.case_law || 'No relevant case law found.'}
• Non-Statutory Rules:
${collectionResults.non_statutory_rules || 'No relevant non-statutory rules found.'}
________________________________________

Final Note
Ensure your final answer is both comprehensive and accessible. Integrate the legal analysis naturally within your explanation so that even a non-specialist can follow your reasoning while maintaining the necessary legal rigor. Do not mention details of this prompt.`;
        } else {
          // Scenario Analysis prompt
          llmPrompt = `System Role
You are OdesAI, a specialized insurance legal assistant. Your role is to answer user questions clearly and engagingly. 

• User Question:
Based on the Claim Summary and Policy Wording, is this claim covered under this policy?
Claim Summary : ${claimSummary || '[User-provided claim summary would appear here. This should describe the incident, damages claimed, and relevant circumstances of the claim.]'}
Policy Wording: ${policyWording || '[User-provided policy wording would appear here. This should contain the relevant insurance policy clauses, conditions, exclusions, and coverage details.]'}


________________________________________

Response Guidelines

Step 1: Reference Q&A Check
• Look for a relevant answer in the provided Reference Q&A.
• If a good match exists, use it as your starting point. If not, proceed to your own legal analysis.

Step 2: Apply the Hierarchy of Legal Authority (English Law)
• Primary Legislation:
  o Treat statutes and Acts of Parliament as the highest authority.
  o Use statutory provisions directly, applying interpretation principles such as the literal, golden, or mischief rules when necessary.
• Secondary Legislation:
  o Follow statutory instruments (SIs) as long as they align with the enabling Act.
• Case Law:
  o Consider relevant court decisions.
  o Adhere to the hierarchy: Supreme Court decisions bind all; Court of Appeal decisions bind lower courts; High Court decisions bind lower courts as appropriate.
• Non-Statutory Rules & Regulations:
  o Include industry codes, regulatory handbooks, or professional guidelines.
  o These should be used as persuasive aids unless statute-mandated.

Step 3: Resolve Conflicts Between Legal Sources
• Statutes vs. Case Law: Statutes generally take precedence.
• Primary vs. Secondary Legislation: SIs must not contradict their enabling Acts.
• Statutory Law vs. Regulatory Rules: Statutes override unless the regulations specifically implement statutory duties.
• For conflicting case law, prioritize the most recent decision from the highest relevant court, keeping an eye out for any noted errors.

Step 4: Cite English Case Law Correctly
• Citation Style:
  o Use UK legal citation standards.
  o For post-2001 cases with neutral citations, follow this format:
    Case Name [Year] Court Abbreviation Case Number.
  o If a law report citation is available, include it after the neutral citation.
• Formatting Rules:
  o Italicize case names and use "v" (without a period) between parties (e.g., Canada Square Operations Ltd v Potter).
  o Use "R" for Crown-related cases (e.g., R v Smith).

Step 5: Construct a Clear, Well-Structured Answer
• Summarize the Issue: Begin with a brief overview of the legal matter based on the user's query.
• Legal Analysis: Clearly outline your reasoning using the appropriate legal authority (statutes, case law, regulations) and support your conclusions with citations.
• Language: Use plain, accessible language unless legal precision is required.
________________________________________

Resources
Use the following resources to enhance your response:
________________________________________

• User Question:
Based on the Claim Summary and Policy Wording, is this claim covered under this policy?
Claim Summary : ${claimSummary || '[User-provided claim summary would appear here. This should describe the incident, damages claimed, and relevant circumstances of the claim.]'}
Policy Wording: ${policyWording || '[User-provided policy wording would appear here. This should contain the relevant insurance policy clauses, conditions, exclusions, and coverage details.]'}
________________________________________

•Reference Q&A:
${collectionResults.insurance_qa || 'No relevant Q&A found.'}
________________________________________

•Primary Legislation:
${collectionResults.primary_legislation || 'No relevant primary legislation found.'}
________________________________________

•Secondary Legislation:
${collectionResults.secondary_legislation || 'No relevant secondary legislation found.'}
________________________________________

•Case Law:
${collectionResults.case_law || 'No relevant case law found.'}
________________________________________

•Non-Statutory Rules:
${collectionResults.non_statutory_rules || 'No relevant non-statutory rules found.'}

________________________________________

Final Note
Ensure your final answer is both comprehensive and accessible. Integrate the legal analysis naturally within your explanation so that even a non-specialist can follow your reasoning while maintaining the necessary legal rigor. Do not mention details of this prompt and guidance.`;
        }

        // Add detailed logging of the prompt
        console.log('=== LLM Prompt ===');
        console.log(llmPrompt);
        console.log('=== End LLM Prompt ===');
        console.log('=== Selected Model ===');
        console.log(selectedModel);
        console.log('=== End Selected Model ===');

      abortControllerRef.current = new AbortController();

      console.log('Sending request to LLM API...');
      console.log('API URL:', API_CONFIG.llmApiUrl);
      console.log('Using streaming:', !API_CONFIG.isNgrok);
      console.log('Request payload:', {
        model: selectedModel,
        prompt: llmPrompt,
        stream: true
      });
      
      // For ngrok connections, use a more direct approach
      if (API_CONFIG.isNgrok) {
        console.log('Using iframe proxy approach for ngrok');
        try {
          // Show a temporary message while waiting for the response
          setCurrentResponse('Waiting for response from LLM...');
          
          // Create a hidden iframe to handle the request
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          document.body.appendChild(iframe);
          
          // Create a form inside the iframe
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          const form = iframeDoc.createElement('form');
          form.method = 'POST';
          form.action = 'http://localhost:8080/api/proxy/fetch';
          
          // Add the data as a hidden input
          const input = iframeDoc.createElement('input');
          input.type = 'hidden';
          input.name = 'data';
          input.value = JSON.stringify({
            model: selectedModel,
            prompt: llmPrompt,
            stream: false
          });
          
          form.appendChild(input);
          iframeDoc.body.appendChild(form);
          
          // Submit the form
          form.submit();
          
          // Wait for the response
          iframe.onload = () => {
            try {
              // Try to get the response from the iframe
              const responseText = iframe.contentDocument.body.innerText;
              const data = JSON.parse(responseText);
              
              console.log('Response from LLM:', data);
              
              // Update the messages with the response
              setMessages([...newMessages, {
                role: 'assistant',
                content: data.response || 'No response received'
              }]);
              
              // Clean up
              document.body.removeChild(iframe);
              setIsStreaming(false);
            } catch (error) {
              console.error('Error parsing iframe response:', error);
              setMessages([...newMessages, {
                role: 'assistant',
                content: `Error: Failed to parse response from LLM. Error: ${error.message}. Please check the console for details.`
              }]);
              
              // Clean up
              document.body.removeChild(iframe);
              setIsStreaming(false);
            }
          };
          
          return;
        } catch (error) {
          console.error('Error with iframe proxy approach:', error);
          setMessages([...newMessages, {
            role: 'assistant',
            content: `Error: Failed to get response from LLM. Error: ${error.message}. Please check the console for details.`
          }]);
          setIsStreaming(false);
          return;
        }
      }
      
      // Regular approach for non-ngrok
      const llmResponse = await fetch(API_CONFIG.llmApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt: llmPrompt,
          stream: true
        }),
        signal: abortControllerRef.current.signal
      });

      console.log('Response status:', llmResponse.status);
      console.log('Response headers:', Object.fromEntries([...llmResponse.headers]));
      
      if (!llmResponse.ok) {
        const errorText = await llmResponse.text();
        console.error('Error from LLM API:', errorText);
        setMessages([...newMessages, {
          role: 'assistant',
          content: `Error: Failed to get response from LLM. Status: ${llmResponse.status}. Please check the console for details.`
        }]);
        setIsLoading(false);
        return;
      }

      // For streaming response
      const reader = llmResponse.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          if (accumulatedResponse.trim()) {
            const finalMessages = [...newMessages, {
              role: 'assistant',
              content: accumulatedResponse.trim()
            }];
            setMessages(finalMessages);
            updateConversationTitle(finalMessages);
          }
          break;
        }

        const chunk = decoder.decode(value);
        try {
          const jsonResponse = JSON.parse(chunk);
          if (jsonResponse.response) {
            accumulatedResponse += jsonResponse.response;
            setCurrentResponse(accumulatedResponse);
          }
        } catch (error) {
          console.error('Error parsing chunk:', error);
        }
      }
      } catch (error) {
        console.error('Error processing RAG query:', error);
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        if (currentResponse.trim()) {
          const finalMessages = [...messages, {
            role: 'assistant',
            content: currentResponse.trim()
          }];
          setMessages(finalMessages);
          updateConversationTitle(finalMessages);
        }
      } else {
        console.error('Error sending message:', error);
        const errorMessages = [...messages, {
          role: 'assistant',
          content: 'Sorry, there was an error processing your request. Please try again.'
        }];
        setMessages(errorMessages);
        updateConversationTitle(errorMessages);
      }
    } finally {
      setIsStreaming(false);
      setCurrentResponse('');
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleDownload = async (filename) => {
    try {
      const response = await fetch(`${API_CONFIG.ragApiUrl}/download/${encodeURIComponent(filename)}`);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert(`Error downloading document: ${error.message}`);
    }
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex',
      bgcolor: theme.background,
      flexDirection: { xs: 'column', sm: 'row' }
    }}>
      {/* Sidebar */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sx={{
          width: { xs: '80%', sm: 260 },
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: { xs: '80%', sm: 260 },
            boxSizing: 'border-box',
            bgcolor: theme.sidebar,
            borderRight: `1px solid ${theme.border}`,
            height: '100%',
            transition: 'transform 0.3s ease-in-out'
          },
        }}
        ModalProps={{
          keepMounted: true // Better mobile performance
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mb: 2 
          }}>
            <img 
              src="/logo.png" 
              alt="OdesAI Logo" 
              style={{ 
                height: '40px',
                width: 'auto',
                marginRight: '10px'
              }} 
            />
            <Typography 
              variant="h6" 
              sx={{ 
                color: theme.text,
                fontWeight: 'bold'
              }}
            >
              OdesAI
            </Typography>
          </Box>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleNewChat}
            sx={{
              color: theme.text,
              borderColor: theme.border,
              '&:hover': {
                borderColor: theme.text,
                bgcolor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            New Chat
          </Button>
        </Box>
        <List sx={{ flexGrow: 1, overflow: 'auto' }}>
          {conversations.map((conv) => (
            <ListItem
              key={conv.id}
              button
              selected={conv.id === currentConversationId}
              onClick={() => handleSelectConversation(conv.id)}
              sx={{
                py: 2,
                color: theme.text,
                '&.Mui-selected': {
                  bgcolor: 'rgba(255,255,255,0.1)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.15)'
                  }
                },
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.05)'
                }
              }}
            >
              <ListItemIcon sx={{ color: theme.text, minWidth: 40 }}>
                <ChatIcon />
              </ListItemIcon>
              <ListItemText 
                primary={conv.title}
                secondary={new Date(conv.timestamp).toLocaleDateString()}
                sx={{
                  '& .MuiListItemText-primary': {
                    color: theme.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  },
                  '& .MuiListItemText-secondary': {
                    color: `${theme.text}80`
                  }
                }}
              />
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteConversation(conv.id);
                }}
                sx={{
                  color: theme.text,
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  '.MuiListItem-root:hover &': {
                    opacity: 0.7
                  },
                  '&:hover': {
                    opacity: 1,
                    bgcolor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                <DeleteIcon />
              </IconButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column',
        width: '100%',
        transition: 'margin 0.3s ease-in-out',
        height: { xs: '100vh', sm: '100vh' },
        position: 'relative'
      }}>
        {/* Header */}
        <AppBar 
          position="static" 
          elevation={0}
          sx={{ 
            bgcolor: theme.background,
            borderBottom: `1px solid ${theme.border}`,
            position: { xs: 'fixed', sm: 'static' },
            top: 0,
            width: '100%',
            zIndex: 1100
          }}
        >
          <Toolbar sx={{ 
            minHeight: { xs: '56px', sm: '64px' },
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton
                edge="start"
                color="inherit"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <img 
                src="/logo.png" 
                alt="OdesAI Logo" 
                style={{ 
                  height: '30px',
                  width: 'auto',
                  marginRight: '10px',
                  display: isSidebarOpen ? 'none' : 'block'
                }} 
              />
              <Typography 
                variant="h6" 
                sx={{ 
                  color: theme.text,
                  fontSize: { xs: '1.1rem', sm: '1.25rem' }
                }}
              >
                {currentConversationId 
                  ? conversations.find(c => c.id === currentConversationId)?.title || 'OdesAI'
                  : 'OdesAI'
                }
              </Typography>
            </Box>
            
            {/* Mode Toggle Buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ToggleButtonGroup
                value={mode}
                exclusive
                onChange={(e, newMode) => {
                  if (newMode !== null) {
                    setMode(newMode);
                  }
                }}
                size="small"
                aria-label="mode selection"
                sx={{
                  mr: 2,
                  '& .MuiToggleButton-root': {
                    color: theme.text,
                    borderColor: theme.border,
                    '&.Mui-selected': {
                      backgroundColor: `${theme.primary}40`,
                      color: theme.text,
                      '&:hover': {
                        backgroundColor: `${theme.primary}60`,
                      }
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.05)'
                    }
                  }
                }}
              >
                <ToggleButton value="qa" aria-label="Q&A mode">
                  <QuestionAnswerIcon sx={{ mr: 1 }} />
                  Q&A
                </ToggleButton>
                <ToggleButton value="scenario" aria-label="Scenario Analysis mode">
                  <AssessmentIcon sx={{ mr: 1 }} />
                  Scenario Analysis
                </ToggleButton>
              </ToggleButtonGroup>
            
              <FormControl 
                variant="outlined" 
                size="small"
                sx={{ 
                  width: { xs: '120px', sm: '200px' },
                  '& .MuiOutlinedInput-root': {
                    color: theme.text,
                    '& fieldset': {
                      borderColor: theme.border,
                    },
                    '&:hover fieldset': {
                      borderColor: theme.primary,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme.primary,
                    },
                  },
                  '& .MuiSelect-icon': {
                    color: theme.text
                  }
                }}
              >
                <InputLabel 
                  id="model-select-label"
                  sx={{ color: theme.text }}
                >
                  Model
                </InputLabel>
                <Select
                  labelId="model-select-label"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  label="Model"
                  sx={{ color: theme.text }}
                >
                  <MenuItem value="mistral">mistral</MenuItem>
                  <MenuItem value="llama3.1:8b">llama3.1:8b</MenuItem>
                  <MenuItem value="phi3:mini">phi3:mini</MenuItem>
                  <MenuItem value="llama3.2:1b">llama3.2:1b</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Messages Area */}
        <Box sx={{ 
          flexGrow: 1, 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          mt: { xs: '56px', sm: 0 },
          mb: { xs: '80px', sm: 0 },  // Add margin bottom for input area
          '&::-webkit-scrollbar': {
            width: '8px',
            display: { xs: 'none', sm: 'block' }
          },
          '&::-webkit-scrollbar-track': {
            background: theme.background,
          },
          '&::-webkit-scrollbar-thumb': {
            background: theme.border,
            borderRadius: '4px',
          },
        }}>
          {messages.map((message, index) => (
            <Box
              key={index}
              sx={{ 
                p: 4,
                width: '100%',
                bgcolor: message.role === 'user' ? theme.messageUser : theme.messageAssistant,
                borderBottom: `1px solid ${theme.border}`,
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <Container 
                maxWidth="md" 
                sx={{ 
                  width: '100%',
                  maxWidth: '800px !important'
                }}
              >
                <Box sx={{ display: 'flex', gap: 3 }}>
                  <Box
                    sx={{
                      minWidth: 70,
                      height: 30,
                      borderRadius: '4px',
                      bgcolor: message.role === 'assistant' ? theme.primary : '#6c757d',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: theme.text,
                      flexShrink: 0,
                      fontSize: '12px',
                      fontWeight: 'bold',
                      px: 1
                    }}
                  >
                    {message.role === 'assistant' ? 'OdesAI' : 'User'}
                  </Box>
                  <Box sx={{ color: theme.text }}>
                    {processMessageContent(message.content).map((part, i) => (
                      part.type === 'citation' ? (
                        <Box 
                          component="span" 
                          key={i}
                          onClick={() => handleDownload(part.filename)}
                          sx={{
                            color: theme.primary,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            padding: '2px 4px',
                            margin: '0 2px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(0, 166, 126, 0.1)',
                            '&:hover': {
                              opacity: 0.8,
                              backgroundColor: 'rgba(0, 166, 126, 0.2)',
                            },
                            display: 'inline-block'
                          }}
                        >
                          {part.content}
                        </Box>
                      ) : (
                        <Box 
                          component="span" 
                          key={i} 
                          sx={{ 
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace'
                          }}
                        >
                          {part.content}
                        </Box>
                      )
                    ))}
                  </Box>
                </Box>
              </Container>
            </Box>
          ))}
          {currentResponse && (
            <Box
              sx={{ 
                p: 4,
                width: '100%',
                bgcolor: theme.messageAssistant,
                borderBottom: `1px solid ${theme.border}`,
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <Container 
                maxWidth="md"
                sx={{ 
                  width: '100%',
                  maxWidth: '800px !important'
                }}
              >
                <Box sx={{ display: 'flex', gap: 3 }}>
                  <Box
                    sx={{
                      minWidth: 70,
                      height: 30,
                      borderRadius: '4px',
                      bgcolor: theme.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: theme.text,
                      flexShrink: 0,
                      fontSize: '12px',
                      fontWeight: 'bold',
                      px: 1
                    }}
                  >
                    OdesAI
                  </Box>
                  <Box sx={{ color: theme.text }}>
                    {processMessageContent(currentResponse).map((part, i) => (
                      part.type === 'citation' ? (
                        <Box 
                          component="span" 
                          key={i}
                          onClick={() => handleDownload(part.filename)}
                          sx={{
                            color: theme.primary,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            padding: '2px 4px',
                            margin: '0 2px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(0, 166, 126, 0.1)',
                            '&:hover': {
                              opacity: 0.8,
                              backgroundColor: 'rgba(0, 166, 126, 0.2)',
                            },
                            display: 'inline-block'
                          }}
                        >
                          {part.content}
                        </Box>
                      ) : (
                        <Box 
                          component="span" 
                          key={i} 
                          sx={{ 
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace'
                          }}
                        >
                          {part.content}
                        </Box>
                      )
                    ))}
                  </Box>
                </Box>
              </Container>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Input Area */}
        <Box 
          component="form" 
          onSubmit={handleSubmit}
          sx={{ 
            p: { xs: 2, sm: 3 },
            bgcolor: 'rgba(52, 53, 65, 0.95)',
            borderTop: `1px solid ${theme.border}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: { xs: 'fixed', sm: 'static' },
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1300,
            backdropFilter: 'blur(10px)',
            boxShadow: '0px -2px 5px rgba(0,0,0,0.1)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            touchAction: 'manipulation',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <Container 
            maxWidth="md"
            sx={{ 
              width: '100%',
              maxWidth: '800px !important',
              px: { xs: 1, sm: 2 },
              '& *': {
                touchAction: 'manipulation'
              }
            }}
          >
            {mode === 'qa' ? (
              // Q&A Input
              window.innerWidth <= 600 ? (
                <Box
                  component="form"
                  onSubmit={handleSubmit}
                  sx={{
                    width: '100%',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: theme.inputBg,
                    borderRadius: '0.75rem',
                    border: `1px solid ${theme.border}`,
                    pr: 1
                  }}
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Send a message..."
                    disabled={isStreaming}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      fontSize: '16px',
                      lineHeight: '1.5',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: theme.text,
                      outline: 'none',
                      WebkitAppearance: 'none',
                      caretColor: theme.text,
                      WebkitUserSelect: 'text',
                      userSelect: 'text',
                      touchAction: 'manipulation'
                    }}
                    enterkeyhint="send"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    autoCapitalize="off"
                    inputMode="text"
                    role="textbox"
                    aria-label="message input"
                    tabIndex="0"
                  />
                  {isStreaming ? (
                    <Button
                      onClick={handleStop}
                      variant="contained"
                      size="small"
                      sx={{ 
                        bgcolor: '#dc3545',
                        minWidth: 'unset',
                        '&:hover': {
                          bgcolor: '#c82333'
                        }
                      }}
                    >
                      Stop
                    </Button>
                  ) : (
                    <IconButton
                      onClick={handleSubmit}
                      disabled={!input.trim() || isStreaming}
                      sx={{ 
                        color: theme.primary,
                        '&.Mui-disabled': {
                          color: theme.border
                        },
                        p: 1
                      }}
                    >
                      <SendIcon sx={{ fontSize: '1.2rem' }} />
                    </IconButton>
                  )}
                </Box>
              ) : (
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Send a message..."
                  variant="outlined"
                  disabled={isStreaming}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: theme.inputBg,
                      color: theme.text,
                      borderRadius: '1rem',
                      fontSize: '1rem',
                      '& fieldset': {
                        borderColor: theme.border,
                      },
                      '&:hover fieldset': {
                        borderColor: theme.primary,
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: theme.primary,
                      },
                    },
                  }}
                  InputProps={{
                    sx: { p: 2 },
                    endAdornment: (
                      <>
                        {isStreaming ? (
                          <Button
                            onClick={handleStop}
                            variant="contained"
                            sx={{ 
                              bgcolor: '#dc3545',
                              '&:hover': {
                                bgcolor: '#c82333'
                              }
                            }}
                          >
                            Stop
                          </Button>
                        ) : (
                          <IconButton
                            onClick={handleSubmit}
                            disabled={!input.trim() || isStreaming}
                            sx={{ 
                              color: theme.primary,
                              '&.Mui-disabled': {
                                color: theme.border
                              }
                            }}
                          >
                            <SendIcon />
                          </IconButton>
                        )}
                      </>
                    ),
                  }}
                />
              )
            ) : (
              // Scenario Analysis Input
              <Box sx={{ width: '100%' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={5}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      maxRows={4}
                      value={policyWording}
                      onChange={(e) => setPolicyWording(e.target.value)}
                      placeholder="Example: This policy covers property damage caused by fire, flood, or storm, excluding damage resulting from wear and tear or lack of maintenance..."
                      label="Policy Wording"
                      variant="outlined"
                      disabled={isStreaming}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: theme.inputBg,
                          color: theme.text,
                          borderRadius: '1rem',
                          fontSize: '1rem',
                          '& fieldset': {
                            borderColor: theme.border,
                          },
                          '&:hover fieldset': {
                            borderColor: theme.primary,
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: theme.primary,
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: theme.text,
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      maxRows={4}
                      value={claimSummary}
                      onChange={(e) => setClaimSummary(e.target.value)}
                      placeholder="Example: Policyholder reports water damage to their property on January 15, 2023, following heavy rainfall. The damage affected the basement and ground floor..."
                      label="Claim Summary"
                      variant="outlined"
                      disabled={isStreaming}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: theme.inputBg,
                          color: theme.text,
                          borderRadius: '1rem',
                          fontSize: '1rem',
                          '& fieldset': {
                            borderColor: theme.border,
                          },
                          '&:hover fieldset': {
                            borderColor: theme.primary,
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: theme.primary,
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: theme.text,
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={2} sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: { xs: 'center', md: 'flex-end' } 
                  }}>
                    {isStreaming ? (
                      <Button
                        onClick={handleStop}
                        variant="contained"
                        sx={{ 
                          bgcolor: '#dc3545',
                          '&:hover': {
                            bgcolor: '#c82333'
                          }
                        }}
                      >
                        Stop
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmit}
                        disabled={!policyWording.trim() || !claimSummary.trim() || isStreaming}
                        variant="contained"
                        sx={{ 
                          bgcolor: theme.primary,
                          color: 'white',
                          '&:hover': {
                            bgcolor: '#008c69'
                          },
                          '&.Mui-disabled': {
                            bgcolor: `${theme.primary}40`,
                            color: 'rgba(255,255,255,0.5)'
                          }
                        }}
                        startIcon={<SendIcon />}
                      >
                        Analyze
                      </Button>
                    )}
                  </Grid>
                </Grid>
              </Box>
            )}
          </Container>
        </Box>
      </Box>
    </Box>
  );
}

export default App; 