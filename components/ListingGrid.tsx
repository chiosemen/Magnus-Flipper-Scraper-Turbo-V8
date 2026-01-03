import React, { useState, useEffect, useMemo } from 'react';
import { Listing } from '../types';
import { 
  MapPin, 
  Star, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  X,
  MessageCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  ShieldAlert,
  Bot,
  ArrowUp,
  ArrowDown,
  ZoomIn,
  Loader2,
  CheckCircle,
  RefreshCw,
  Tag,
  Globe,
  User,
  Bookmark
} from 'lucide-react';

interface ListingGridProps {
  listings: Listing[];
  isLoading: boolean;
  onManualMessage: (listing: Listing) => void;
  onToggleSave: (id: string) => void;
}

const ITEMS_PER_PAGE = 9;

type SortField = 'date' | 'price' | 'rating';
type SortOrder = 'asc' | 'desc';

export const ListingGrid: React.FC<ListingGridProps> = ({ listings, isLoading, onManualMessage, onToggleSave }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  
  // Sorting State
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc'); // date asc = newest (based on logic below where smaller number = newer)
  
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // Load saved IDs from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('magnusflipper_saved_items');
    if (saved) {
      try {
        setSavedIds(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading saved items:', e);
      }
    }
  }, []);

  // Zoom state
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  // Handle Save Toggle
  const handleToggleSave = (id: string) => {
    setSavedIds(prev => {
      const newSavedIds = prev.includes(id) 
        ? prev.filter(savedId => savedId !== id)
        : [...prev, id];
      
      localStorage.setItem('magnusflipper_saved_items', JSON.stringify(newSavedIds));
      return newSavedIds;
    });
    
    // Also call parent prop if needed
    onToggleSave(id);
  };

  // Merge listings with saved state
  const processedListings = useMemo(() => {
    return listings.map(item => ({
      ...item,
      isSaved: savedIds.includes(item.id)
    }));
  }, [listings, savedIds]);

  // Reset page when listings or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [listings, sortField, sortOrder]);

  useEffect(() => {
    if (selectedListing) {
      document.body.style.overflow = 'hidden';
      // Reset zoom when opening a new listing
      setIsZoomed(false);
      setZoomOrigin({ x: 50, y: 50 });
      
      // Update selected listing from processed listings to reflect saved state changes
      const freshListing = processedListings.find(l => l.id === selectedListing.id);
      if (freshListing && (freshListing !== selectedListing || freshListing.isSaved !== selectedListing.isSaved)) {
        setSelectedListing(freshListing);
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedListing, processedListings]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin({ x, y });
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setZoomOrigin({ x, y });
    }
    setIsZoomed(!isZoomed);
  };

  const parseTime = (str: string) => {
    if (!str) return 999999;
    if (str.toLowerCase() === 'just now') return 0;
    if (str.toLowerCase().includes('prime')) return 999; // Treat as not time-relevant
    
    const match = str.match(/(\d+)/);
    if (!match) return 9999;
    
    let val = parseInt(match[1], 10);
    if (str.includes('hour') || str.includes('hr')) val *= 60;
    if (str.includes('day')) val *= 1440;
    return val;
  };

  const sortedListings = useMemo(() => {
    const sorted = [...processedListings];
    sorted.sort((a, b) => {
      let valA, valB;
      
      switch (sortField) {
        case 'price':
          valA = a.price;
          valB = b.price;
          break;
        case 'rating':
          valA = a.rating || 0;
          valB = b.rating || 0;
          break;
        case 'date':
        default:
          valA = parseTime(a.postedTime);
          valB = parseTime(b.postedTime);
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [processedListings, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
        setSortField(field);
        // Default directions logic
        // Date: asc (smaller number = newer)
        // Price: asc (cheaper first)
        // Rating: desc (higher first)
        if (field === 'rating') setSortOrder('desc');
        else setSortOrder('asc');
    }
  };

  if (isLoading && listings.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-800 rounded-xl h-72"></div>
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/50 text-slate-400">
        <Bot className="w-12 h-12 mb-4 text-slate-600" />
        <p className="font-medium">No active listings found.</p>
        <p className="text-sm opacity-70 mt-2">Adjust your filters or start the monitor.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(sortedListings.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentListings = sortedListings.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePrevious = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNext = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const getMarketplaceColor = (m: string) => {
    switch(m) {
      case 'facebook': return 'bg-blue-600';
      case 'craigslist': return 'bg-purple-600';
      case 'ebay': return 'bg-red-500';
      case 'vinted': return 'bg-teal-500';
      default: return 'bg-slate-600';
    }
  };

  const getAutomationButtonContent = (status: string) => {
    switch(status) {
      case 'sending':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'sent':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <RefreshCw className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getAutomationButtonStyle = (status: string) => {
    switch(status) {
      case 'sending':
        return 'bg-indigo-500/50 text-white cursor-wait';
      case 'sent':
        return 'bg-emerald-500/20 text-emerald-400 cursor-default';
      case 'failed':
        return 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30';
      default:
        return 'bg-slate-700 hover:bg-indigo-600 text-white';
    }
  };

  const SortButton = ({ field, label, icon: Icon }: { field: SortField, label: string, icon: any }) => {
    const isActive = sortField === field;
    return (
      <button 
        onClick={() => handleSort(field)}
        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all border ${
          isActive 
            ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' 
            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
        }`}
      >
        <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-200' : 'text-slate-500'}`} />
        <span>{label}</span>
        {isActive && (
          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Sorting Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 shadow-sm">
        <span className="text-sm text-slate-400 font-medium">
          Showing <span className="text-white font-bold">{sortedListings.length}</span> results
        </span>
        
        <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 hidden sm:inline-block">Sort By:</span>
          
          <SortButton field="date" label="Posted Time" icon={Clock} />
          <SortButton field="price" label="Price" icon={DollarSign} />
          <SortButton field="rating" label="Rating" icon={Star} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentListings.map((item) => (
          <div 
            key={item.id} 
            onClick={() => setSelectedListing(item)}
            className={`group relative bg-slate-800 rounded-xl overflow-hidden border transition-all duration-300 ease-out shadow-lg hover:shadow-2xl cursor-pointer ${item.isSpam ? 'border-rose-900/50 opacity-80 hover:opacity-100' : 'border-slate-700 hover:border-indigo-400/50 hover:-translate-y-2'}`}
          >
            {/* Badges */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
               <span className={`px-2 py-1 rounded text-[10px] font-bold text-white uppercase tracking-wider ${getMarketplaceColor(item.marketplace)} shadow-md`}>
                 {item.marketplace}
               </span>
               {item.isSpam && (
                 <span className="px-2 py-1 rounded text-[10px] font-bold text-white uppercase tracking-wider bg-rose-600 shadow-md flex items-center gap-1">
                   <ShieldAlert className="w-3 h-3" /> SPAM
                 </span>
               )}
            </div>

            <div className="relative h-48 overflow-hidden bg-slate-900">
              <img 
                src={item.imageUrl} 
                alt={item.title} 
                className={`w-full h-full object-cover transition-transform duration-700 ease-out ${item.isSpam ? 'grayscale group-hover:grayscale-0' : 'group-hover:scale-110'}`}
              />
              
              {/* Header Actions: Price & Save */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                 <div className="bg-slate-900/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold text-white border border-slate-700 shadow-sm">
                   {item.currency}{item.price}
                 </div>
                 <button
                   onClick={(e) => { e.stopPropagation(); handleToggleSave(item.id); }}
                   className="p-1.5 bg-slate-900/90 hover:bg-slate-800 rounded-full text-slate-300 border border-slate-700 shadow-sm transition-colors group/btn"
                   title={item.isSaved ? "Remove from Saved" : "Save Listing"}
                 >
                    <Bookmark className={`w-4 h-4 transition-colors ${item.isSaved ? 'fill-indigo-500 text-indigo-500' : 'group-hover/btn:text-white'}`} />
                 </button>
              </div>
              
              {/* Profit Potential Badge */}
              {!item.isSpam && (item.profitPotential || 0) > 100 && (
                <div className="absolute bottom-0 inset-x-0 bg-emerald-500/90 text-white text-xs font-bold py-1 px-3 flex items-center justify-center gap-1 backdrop-blur-sm">
                  <DollarSign className="w-3 h-3" /> Est. Profit: +${item.profitPotential}
                </div>
              )}
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                 <div className="flex items-center gap-1.5 text-xs text-slate-400">
                   <Clock className="w-3 h-3" /> {item.postedTime}
                 </div>
                 <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>{item.rating?.toFixed(1)}</span>
                 </div>
              </div>
              
              <h3 className="font-semibold text-slate-100 mb-1 line-clamp-1 group-hover:text-indigo-400 transition-colors">{item.title}</h3>
              
              <div className="flex items-center justify-between mt-3">
                 <span className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-300">
                   {item.condition}
                 </span>
                 
                 <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onManualMessage(item); }}
                      disabled={item.automationStatus === 'sending' || item.automationStatus === 'sent'}
                      className={`p-2 rounded-lg transition-colors ${getAutomationButtonStyle(item.automationStatus)}`}
                      title={item.automationStatus === 'sent' ? 'Message Sent' : 'Send Agent Message'}
                    >
                      {getAutomationButtonContent(item.automationStatus)}
                    </button>
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <button onClick={handlePrevious} disabled={currentPage === 1} className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-slate-400">Page {currentPage} of {totalPages}</span>
          <button onClick={handleNext} disabled={currentPage === totalPages} className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedListing && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" 
          onClick={() => setSelectedListing(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-200" 
            onClick={(e) => e.stopPropagation()}
          >
             <button onClick={() => setSelectedListing(null)} className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors">
               <X className="w-5 h-5" />
             </button>

             {/* Zoomable Image Container */}
             <div 
                className={`w-full md:w-1/2 bg-slate-800/50 flex items-center justify-center p-4 relative overflow-hidden group ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
                onClick={handleImageClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setIsZoomed(false)}
             >
               <img 
                 src={selectedListing.imageUrl} 
                 alt={selectedListing.title} 
                 className="max-h-[60vh] object-contain shadow-2xl rounded-lg transition-transform duration-200 ease-out will-change-transform"
                 style={{
                   transform: isZoomed ? 'scale(2.5)' : 'scale(1)',
                   transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`
                 }}
               />
               
               {/* Zoom Hint */}
               {!isZoomed && (
                 <div className="absolute bottom-6 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                    <ZoomIn className="w-3 h-3" />
                    Click to Zoom
                 </div>
               )}
             </div>
             
             <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar">
               <div className="mb-6">
                 <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getMarketplaceColor(selectedListing.marketplace)} text-white`}>{selectedListing.marketplace}</span>
                    <span className="text-slate-400 text-xs flex items-center gap-1"><Clock className="w-3 h-3"/> Found {selectedListing.postedTime}</span>
                 </div>
                 <h2 className="text-2xl font-bold text-white mb-2 leading-tight">{selectedListing.title}</h2>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl font-bold text-white">{selectedListing.currency}{selectedListing.price}</span>
                        {(selectedListing.profitPotential || 0) > 0 && (
                        <span className="text-emerald-400 text-sm font-medium bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Est. Profit: ${selectedListing.profitPotential}</span>
                        )}
                    </div>
                    
                    <button
                        onClick={(e) => { e.stopPropagation(); handleToggleSave(selectedListing.id); }}
                        className={`p-2 rounded-lg border flex items-center gap-2 transition-all ${selectedListing.isSaved ? 'bg-indigo-900/30 border-indigo-500/50 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                    >
                        <Bookmark className={`w-5 h-5 ${selectedListing.isSaved ? 'fill-indigo-400' : ''}`} />
                        <span className="text-xs font-bold uppercase">{selectedListing.isSaved ? 'Saved' : 'Save'}</span>
                    </button>
                 </div>
               </div>

               {/* Comprehensive Details Grid */}
               <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                     <span className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Condition</span>
                     <div className="flex items-center gap-2 text-sm text-slate-200 font-medium">
                        <Tag className="w-4 h-4 text-indigo-400" />
                        {selectedListing.condition}
                     </div>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                     <span className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Location</span>
                     <div className="flex items-center gap-2 text-sm text-slate-200 font-medium">
                        <MapPin className="w-4 h-4 text-indigo-400" />
                        {selectedListing.location}
                     </div>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                     <span className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Seller Rating</span>
                     <div className="flex items-center gap-2 text-sm text-slate-200 font-medium">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        {selectedListing.rating.toFixed(1)} <span className="text-slate-500 text-xs">({selectedListing.reviews})</span>
                     </div>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                     <span className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Source</span>
                     <div className="flex items-center gap-2 text-sm text-slate-200 font-medium capitalize">
                        <Globe className="w-4 h-4 text-indigo-400" />
                        {selectedListing.marketplace}
                     </div>
                  </div>
               </div>

               {/* Seller Insights Section */}
               <div className="space-y-4 mb-6">
                 <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                       <User className="w-3 h-3" /> Seller Insights
                    </h4>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-600">
                            {selectedListing.sellerName.charAt(0).toUpperCase()}
                         </div>
                         <span className="text-slate-200 font-medium">{selectedListing.sellerName}</span>
                      </div>
                      {selectedListing.sellerJoinedYear && (
                        <span className="text-slate-400 text-xs bg-slate-800 px-2 py-1 rounded border border-slate-700">Joined {selectedListing.sellerJoinedYear}</span>
                      )}
                    </div>
                    {selectedListing.isSpam ? (
                      <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 mt-3">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span className="font-medium">Flagged: {selectedListing.spamReason || 'Suspicious Activity'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 mt-3">
                        <CheckCircle className="w-5 h-5 shrink-0" />
                        <span className="font-medium">Verified High-Rated Account</span>
                      </div>
                    )}
                 </div>
               </div>

               <div className="mt-auto space-y-3">
                 <button 
                   onClick={(e) => { e.stopPropagation(); onManualMessage(selectedListing); setSelectedListing(null); }}
                   disabled={selectedListing.automationStatus === 'sending' || selectedListing.automationStatus === 'sent'}
                   className={`w-full py-3 font-semibold rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all ${
                     selectedListing.automationStatus === 'sent' 
                       ? 'bg-emerald-600/20 text-emerald-400 cursor-default'
                       : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25'
                   }`}
                 >
                   {selectedListing.automationStatus === 'sending' ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                   ) : selectedListing.automationStatus === 'sent' ? (
                      <><CheckCircle className="w-4 h-4" /> Message Sent</>
                   ) : (
                      <><Bot className="w-4 h-4" /> {selectedListing.automationStatus === 'failed' ? 'Retry Auto-Message' : 'Use MM Agent (Auto-Message)'}</>
                   )}
                 </button>
                 <a 
                   href={selectedListing.link} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg flex items-center justify-center gap-2 border border-slate-700"
                   onClick={(e) => e.stopPropagation()}
                 >
                   Open in {selectedListing.marketplace} <ExternalLink className="w-4 h-4" />
                 </a>
                 <div className="pt-2 text-center">
                    <span className="text-[10px] text-slate-600 font-mono">ID: {selectedListing.id}</span>
                 </div>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};