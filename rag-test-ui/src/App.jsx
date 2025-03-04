import React, { useState, useEffect } from 'react';
import { 
  Container, 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  Box, 
  CircularProgress, 
  Input,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  Grid,
  FormControlLabel,
  Switch
} from '@mui/material';

// Add API configuration based on hostname
const getApiConfig = () => {
  const hostname = window.location.hostname;
  const isNgrok = hostname.includes('ngrok');
  
  if (isNgrok) {
    // When accessed through ngrok, use the proxy endpoint
    return '/api/rag';
  } else {
    // When accessed locally, use direct URL
    return 'http://localhost:8082';
  }
};

// Add API base URL constant
const API_BASE_URL = getApiConfig();

const COLLECTIONS = [
  { id: 'primary_legislation', name: 'Primary Legislation' },
  { id: 'secondary_legislation', name: 'Secondary Legislation' },
  { id: 'case_law', name: 'Case Law' },
  { id: 'non_statutory_rules', name: 'Non-Statutory Rules' },
  { id: 'insurance_qa', name: 'Insurance Q&A' },
  { id: 'legal_docs', name: 'Legal Documents' }
];

// Items per page options
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [documents, setDocuments] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState('insurance_qa');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showStats, setShowStats] = useState(true);

  // Function to fetch documents with pagination
  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      
      // First, get collection stats to know total document count
      const statsResponse = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collection: selectedCollection,
          query: "",
          n_results: 1 // Just get count
        })
      });

      if (!statsResponse.ok) {
        throw new Error(`HTTP error! status: ${statsResponse.status}`);
      }

      const statsData = await statsResponse.json();
      const totalDocCount = statsData.matches ? statsData.matches.length : 0;
      setTotalItems(totalDocCount);
      setTotalPages(Math.ceil(totalDocCount / itemsPerPage) || 1); // Ensure at least 1 page
      
      // If collection is empty, set empty documents and return early
      if (totalDocCount === 0) {
        setDocuments({});
        setIsLoading(false);
        return;
      }
      
      // If we have a lot of documents, only fetch the current page
      const fetchLimit = Math.min(itemsPerPage, 1000); // API limit or our page size
      const response = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collection: selectedCollection,
          query: "",
          n_results: fetchLimit
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Raw response data:', data);

      if (!data.matches || !Array.isArray(data.matches)) {
        throw new Error('Invalid response format from server');
      }

      // Calculate pagination slice
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, data.matches.length);
      const paginatedMatches = data.matches.slice(startIndex, endIndex);

      const docsBySource = paginatedMatches.reduce((acc, match) => {
        const source = match.metadata?.source || 'Unknown Source';
        if (!acc[source]) {
          acc[source] = [];
        }

        let question = '';
        let answer = '';
        
        // Parse Q&A format
        if (match.text) {
          if (match.text.includes('Q:') && match.text.includes('A:')) {
            const parts = match.text.split('A:');
            if (parts.length === 2) {
              question = parts[0].replace('Q:', '').trim();
              answer = parts[1].trim();
            }
          } else {
            // If not in Q&A format, use the whole text as the answer
            answer = match.text;
          }
        }
        
        acc[source].push({
          text: match.text || 'No text available',
          question: question || match.metadata?.question || '',
          answer: answer || 'No answer available',
          metadata: match.metadata || { note: 'No metadata available' },
          distance: match.distance || 0
        });
        return acc;
      }, {});

      console.log('Processed documents:', docsBySource);
      setDocuments(docsBySource);
      setError(null);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Error fetching documents: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedCollection, currentPage, itemsPerPage]);

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  const handleItemsPerPageChange = (event) => {
    setItemsPerPage(parseInt(event.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collection: selectedCollection,
          query: query,
          n_results: 5
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const transformedMatches = data.matches.map((match, index) => ({
        text: match.text || 'No text available',
        metadata: match.metadata || { note: 'No metadata available' },
        distance: match.distance || 0,
        isQAPair: match.metadata?.type === 'qa_pair'
      }));
      setResults(transformedMatches);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('collection', selectedCollection);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setUploadStatus(result.message);
      await fetchDocuments();
    } catch (err) {
      console.error('Error:', err);
      setError(`Upload error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (source) => {
    if (!window.confirm(`Are you sure you want to delete all documents from "${source}"?`)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          collection: selectedCollection,
          source 
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setUploadStatus(result.message);
      await fetchDocuments();
    } catch (err) {
      console.error('Error:', err);
      setError(`Delete error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <img 
          src="/logo/download.png" 
          alt="Odes AI Logo" 
          style={{ height: '50px', marginRight: '16px' }} 
        />
        <Typography variant="h4">
          Odes AI RAG System Test UI
        </Typography>
      </Box>

      {/* Collection Selector */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel>Collection</InputLabel>
          <Select
            value={selectedCollection}
            onChange={(e) => {
              setSelectedCollection(e.target.value);
              setCurrentPage(1); // Reset to first page when changing collection
            }}
            label="Collection"
          >
            {COLLECTIONS.map((collection) => (
              <MenuItem key={collection.id} value={collection.id}>
                {collection.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {/* Upload Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Upload Document to {COLLECTIONS.find(c => c.id === selectedCollection)?.name}
        </Typography>
        <Input
          type="file"
          onChange={handleFileUpload}
          disabled={isLoading}
          sx={{ mb: 2 }}
        />
        {uploadStatus && (
          <Typography color="success.main" sx={{ mt: 1 }}>
            {uploadStatus}
          </Typography>
        )}
      </Paper>

      {/* Query Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Query Documents
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your query..."
            disabled={isLoading}
            sx={{ mb: 2 }}
            inputProps={{
              'enterkeyhint': 'send',
              'autoComplete': 'off',
              'autoCorrect': 'off',
              'spellCheck': 'false',
              'autoCapitalize': 'off',
              'inputMode': 'text'
            }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
          >
            Search
          </Button>
        </form>

        {isLoading && <CircularProgress sx={{ mt: 2 }} />}
        
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}

        {results && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Search Results
            </Typography>
            {results.map((result, index) => (
              <Paper key={index} sx={{ p: 2, mb: 2 }}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Relevance Score: {(1 - ((result.distance - Math.min(...results.map(r => r.distance))) / (Math.max(...results.map(r => r.distance)) - Math.min(...results.map(r => r.distance))))).toFixed(4)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Raw Distance: {result.distance.toFixed(4)}
                  </Typography>
                </Box>
                <Typography variant="body1">
                  {result.text}
                </Typography>
                {result.metadata && result.metadata.source ? (
                  <Typography variant="caption" color="text.secondary">
                    Source: {result.metadata.source}
                  </Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    Source: Unknown Source
                  </Typography>
                )}
              </Paper>
            ))}
          </Box>
        )}
      </Paper>

      {/* Document List Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Documents in {COLLECTIONS.find(c => c.id === selectedCollection)?.name}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={showStats}
                onChange={(e) => setShowStats(e.target.checked)}
              />
            }
            label="Show Stats"
          />
        </Box>
        
        {/* Collection Statistics */}
        {showStats && (
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f8f9fa' }}>
            <Typography variant="subtitle1" gutterBottom>
              Collection Statistics
            </Typography>
            <Typography variant="body2">
              Total Documents: {totalItems}
            </Typography>
            <Typography variant="body2">
              Showing Page {currentPage} of {totalPages || 1}
            </Typography>
            <Typography variant="body2">
              Displaying {itemsPerPage} items per page
            </Typography>
          </Paper>
        )}
        
        {/* Pagination Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Items per page</InputLabel>
            <Select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              label="Items per page"
              size="small"
            >
              {ITEMS_PER_PAGE_OPTIONS.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Pagination 
            count={totalPages || 1} 
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            disabled={isLoading}
          />
        </Box>
        
        {/* Document List */}
        {documents ? (
          Object.entries(documents).length > 0 ? (
            Object.entries(documents).map(([source, docs]) => (
              <Box key={source} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Source: {source} ({docs.length} documents)
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => handleDelete(source)}
                    disabled={isLoading}
                  >
                    Delete All
                  </Button>
                </Box>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2,
                    bgcolor: '#f5f5f5',
                    maxHeight: '500px',
                    overflow: 'auto'
                  }}
                >
                  {docs.map((doc, index) => (
                    <Paper
                      key={index}
                      elevation={0}
                      sx={{ 
                        mb: 2,
                        p: 2,
                        bgcolor: '#ffffff',
                        border: '1px solid #e0e0e0',
                        borderRadius: 1
                      }}
                    >
                      {doc.question ? (
                        <>
                          <Typography 
                            variant="subtitle2" 
                            color="primary" 
                            gutterBottom
                            sx={{ fontWeight: 'bold' }}
                          >
                            Q: {doc.question}
                          </Typography>
                          <Typography variant="body2">
                            A: {doc.answer}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body2">
                          {doc.text}
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Paper>
              </Box>
            ))
          ) : (
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 3, 
                textAlign: 'center',
                bgcolor: '#f9f9f9'
              }}
            >
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                No documents found in the <strong>{COLLECTIONS.find(c => c.id === selectedCollection)?.name}</strong> collection.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This collection exists but contains 0 documents. You can upload documents using the upload section above.
              </Typography>
            </Paper>
          )
        ) : (
          <CircularProgress />
        )}
        
        {/* Bottom Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination 
              count={totalPages} 
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              disabled={isLoading}
            />
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default App; 