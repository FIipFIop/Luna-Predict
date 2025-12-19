// OpenRouter API configuration
const OPENROUTER_API_KEY = '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';

const $ = id => document.getElementById(id);

// DOM elements
const dropzone = $('dropzone');
const fileInput = $('fileInput');
const cameraInput = $('cameraInput');
const cameraBtn = $('cameraBtn');
const galleryBtn = $('galleryBtn');
const preview = $('preview');
const previewImg = $('previewImg');
const removeBtn = $('removeBtn');
const analyzeBtn = $('analyzeBtn');
const timeframe = $('timeframe');
const timeframeConfirm = $('timeframeConfirm');
const detectedTimeframe = $('detectedTimeframe');
const confirmTimeframeBtn = $('confirmTimeframeBtn');
const changeTimeframeBtn = $('changeTimeframeBtn');
const results = $('results');
const error = $('error');

let selectedFile = null;
let detectedTimeframeValue = null;
let analysisData = null;

// ============= CHART ANALYSIS =============

// Dropzone click
dropzone.addEventListener('click', e => {
  if (!e.target.closest('.remove-btn') && !e.target.closest('.mobile-btn')) {
    fileInput.click();
  }
});

fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });
cameraInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

if (cameraBtn) {
  cameraBtn.addEventListener('click', e => {
    e.stopPropagation();
    cameraInput.click();
  });
}

if (galleryBtn) {
  galleryBtn.addEventListener('click', e => {
    e.stopPropagation();
    fileInput.click();
  });
}

// Drag and drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => {
  dropzone.addEventListener(e, ev => {
    ev.preventDefault();
    ev.stopPropagation();
  });
});

dropzone.addEventListener('dragover', () => dropzone.classList.add('dragover'));
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', e => {
  dropzone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    showError('Please select an image file');
    return;
  }

  selectedFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    previewImg.src = e.target.result;
    preview.classList.remove('hidden');
    dropzone.querySelector('.dropzone-content').classList.add('hidden');
    analyzeBtn.disabled = false;
    results.classList.add('hidden');
    error.classList.add('hidden');

    if (timeframe.value === 'auto') {
      timeframeConfirm.classList.add('hidden');
    }
  };
  reader.readAsDataURL(file);
}

removeBtn.addEventListener('click', e => {
  e.stopPropagation();
  selectedFile = null;
  previewImg.src = '';
  preview.classList.add('hidden');
  dropzone.querySelector('.dropzone-content').classList.remove('hidden');
  analyzeBtn.disabled = true;
  fileInput.value = '';
  cameraInput.value = '';
  timeframeConfirm.classList.add('hidden');
  results.classList.add('hidden');
  error.classList.add('hidden');
});

timeframe.addEventListener('change', () => {
  if (timeframe.value === 'auto') {
    timeframeConfirm.classList.add('hidden');
  }
});

confirmTimeframeBtn.addEventListener('click', () => {
  timeframeConfirm.classList.add('hidden');
  showResults(analysisData);
});

changeTimeframeBtn.addEventListener('click', () => {
  timeframeConfirm.classList.add('hidden');
  results.classList.add('hidden');
});

analyzeBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  analyzeBtn.disabled = true;
  analyzeBtn.querySelector('.btn-text').textContent = 'Analyzing...';
  analyzeBtn.querySelector('.btn-loader').classList.remove('hidden');
  error.classList.add('hidden');
  results.classList.add('hidden');

  try {
    // Convert file to base64
    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);

    reader.onload = async () => {
      const imageUrl = reader.result;

      // Build AI prompt based on timeframe mode
      const isAutoDetect = timeframe.value === 'auto';
      const timeframeText = isAutoDetect
        ? 'Determine the timeframe from the chart (look for labels, time intervals, or date ranges visible)'
        : `${timeframe.value} timeframe`;

      const prompt = isAutoDetect
        ? `Analyze this crypto chart and detect its timeframe. IMPORTANT: This could be a CANDLESTICK chart (TradingView/exchanges) OR a LINE/AREA chart from Phantom wallet or other crypto wallets.

TIMEFRAME DETECTION STRATEGY:
1. For Phantom wallet charts (smooth line/area): Check top of chart for timeframe buttons/labels (1H, 1D, 1W, 1M, ALL)
2. For all charts: Look at X-axis time labels and calculate spacing between data points
3. Date range method: If you see "Jan 1 - Jan 7" = likely 1H/4H/1D depending on point density
4. Candle spacing: Wide gaps = higher timeframe (1D/1W), tight = lower (1m/5m/15m/1H)

CHART TYPE IDENTIFICATION:
- Candlestick: Red/green bars with wicks (TradingView, Binance, Coinbase Pro)
- Line: Smooth colored line (Phantom wallet, Trust Wallet, MetaMask)
- Area: Filled gradient under line (Phantom wallet default)

ANALYSIS FOR LINE CHARTS (Phantom wallet):
- Identify trend from line direction and slope
- Find support/resistance at previous price levels where line bounced
- Look for breakouts above/below historical levels
- Consider volume (if visible) at key price points

Respond ONLY with valid JSON: {"timeframe":"1m/5m/15m/30m/1h/4h/1d/1w/1M","timeframeConfidence":"high/medium/low","chartType":"candlestick/line/area","recommendation":"LONG/SHORT","certainty":85,"entryPrice":"$X (desc)","stopLoss":"$X (-X%)","takeProfit":"$X (+X%)","riskRewardRatio":"X:1","report":"Detailed analysis with patterns, trend direction, support/resistance levels, and SL/TP justification"}. Min 2:1 R:R required.`
        : `Analyze this ${timeframe.value} crypto chart. IMPORTANT: This could be a candlestick chart OR a line/area chart from Phantom wallet.

ANALYSIS APPROACH:
For CANDLESTICK charts: Use traditional technical analysis (patterns, support/resistance, candle formations)
For LINE/AREA charts (Phantom wallet): Focus on trend direction, price levels, breakouts, and historical bounces

KEY POINTS FOR PHANTOM WALLET CHARTS:
- Smooth line = trend is more important than individual candles
- Support/resistance at previous price levels where line bounced or reversed
- Breakouts above resistance or below support are strong signals
- Consider overall trend strength (steep vs gradual slope)

Respond ONLY with valid JSON: {"recommendation":"LONG/SHORT","certainty":85,"entryPrice":"$X (desc)","stopLoss":"$X (-X%)","takeProfit":"$X (+X%)","riskRewardRatio":"X:1","report":"Detailed analysis identifying chart type, trend direction, key support/resistance levels, and trade rationale"}. Min 2:1 R:R required.`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.href,
          'X-Title': 'Crypto Chart Analyzer'
        },
        body: JSON.stringify({
          model: 'nvidia/nemotron-nano-12b-v2-vl:free',
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl } },
              { type: 'text', text: prompt }
            ]
          }],
          temperature: 0.7,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter API error:', response.status, errorText);
        throw new Error('Failed to analyze chart');
      }

      const apiResponse = await response.json();
      console.log('OpenRouter API response:', JSON.stringify(apiResponse).substring(0, 200));

      const content = apiResponse.choices?.[0]?.message?.content;
      if (!content) {
        console.error('No content in API response:', apiResponse);
        throw new Error('The AI did not return a valid response. Please try again.');
      }

      let analysis;
      try {
        const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
        analysis = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content);
      } catch (e) {
        analysis = {
          recommendation: content.toUpperCase().includes('LONG') ? 'LONG' : 'SHORT',
          certainty: 75,
          entryPrice: 'See report',
          stopLoss: 'See report',
          takeProfit: 'See report',
          riskRewardRatio: '2:1',
          report: content
        };
      }

      const data = {
        recommendation: analysis.recommendation || 'N/A',
        certainty: analysis.certainty || 0,
        entryPrice: analysis.entryPrice || 'Not specified',
        stopLoss: analysis.stopLoss || 'Not specified',
        takeProfit: analysis.takeProfit || 'Not specified',
        riskRewardRatio: analysis.riskRewardRatio || 'N/A',
        report: analysis.report || content,
        timeframe: analysis.timeframe || timeframe.value,
        timeframeConfidence: analysis.timeframeConfidence || 'high',
        chartType: analysis.chartType || 'candlestick'
      };

      analysisData = data;

      if (timeframe.value === 'auto' && data.timeframe) {
        detectedTimeframeValue = data.timeframe;
        detectedTimeframe.textContent = `${data.timeframe} (${data.timeframeConfidence || 'medium'} confidence)`;
        timeframeConfirm.classList.remove('hidden');
      } else {
        showResults(data);
      }
    };

    reader.onerror = () => {
      throw new Error('Failed to read image file');
    };

  } catch (err) {
    console.error('Analysis error:', err);
    showError(err.message || 'Network error. Please try again.');
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.querySelector('.btn-text').textContent = 'Analyze Chart';
    analyzeBtn.querySelector('.btn-loader').classList.add('hidden');
  }
});

function showResults(data) {
  $('recommendation').textContent = data.recommendation;
  $('recommendation').className = `card-value recommendation ${data.recommendation}`;
  $('certainty').textContent = data.certainty;
  $('riskReward').textContent = data.riskRewardRatio;
  $('entryPrice').textContent = data.entryPrice;
  $('stopLoss').textContent = data.stopLoss;
  $('takeProfit').textContent = data.takeProfit;
  $('report').textContent = data.report;
  results.classList.remove('hidden');
  results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showError(message) {
  error.textContent = message;
  error.classList.remove('hidden');
  error.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
