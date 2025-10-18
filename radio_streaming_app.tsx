import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, MessageCircle, Share2, Calendar, Users, Radio, Signal, Heart, Settings, Edit3, Send } from 'lucide-react';

const RadioStreamingApp = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(75);
  const [isConnected, setIsConnected] = useState(true);
  const [currentShow, setCurrentShow] = useState('Morning Drive');
  const [currentDJ, setCurrentDJ] = useState('Sarah Martinez');
  const [currentSong, setCurrentSong] = useState({
    title: 'Perfect Strangers',
    artist: 'Jonas Blue ft. JP Cooper',
    time: '2:47 / 3:52'
  });
  const [listeners, setListeners] = useState(2847);
  const [isMuted, setIsMuted] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedule] = useState([
    { time: "5:00 AM - 6:00 AM", show: "Early Bird Music", dj: "Auto DJ", description: "Wake up with your favorite hits" },
    { time: "6:00 AM - 10:00 AM", show: "Morning Drive", dj: "Sarah Martinez", description: "Start your day right with Sarah! News, traffic, and the hottest pop hits", current: true },
    { time: "10:00 AM - 2:00 PM", show: "Mid-Morning Mix", dj: "Jake Thompson", description: "Non-stop music to keep your energy up" },
    { time: "2:00 PM - 6:00 PM", show: "Afternoon Groove", dj: "Maria Lopez", description: "The perfect soundtrack for your afternoon" },
    { time: "6:00 PM - 8:00 PM", show: "Drive Time Hits", dj: "Alex Chen", description: "Beating traffic with the biggest hits" },
    { time: "8:00 PM - 10:00 PM", show: "Pop Tonight", dj: "Emma Wilson", description: "Tonight's biggest pop anthems and new releases" },
    { time: "10:00 PM - 12:00 AM", show: "Late Night Vibes", dj: "Ryan Brooks", description: "Chill out with smooth pop and indie favorites" },
    { time: "12:00 AM - 5:00 AM", show: "Overnight Mix", dj: "Auto DJ", description: "Continuous music through the night" }
  ]);
  const [recentPosts, setRecentPosts] = useState([
    { id: 1, content: "🎵 Coming up next: Taylor Swift's latest hit! What's your favorite Taylor song?", time: "2 hours ago", likes: 47 },
    { id: 2, content: "Beautiful morning here in the studio! ☀️ Perfect weather for some feel-good music.", time: "4 hours ago", likes: 23 }
  ]);
  const audioRef = useRef(null);

  // Simulate stream connection
  useEffect(() => {
    if (isPlaying) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setIsConnected(true);
      }, 1500); // <2 second target from our analysis
    }
  }, [isPlaying]);

  // Simulate listener count updates
  useEffect(() => {
    const interval = setInterval(() => {
      setListeners(prev => prev + Math.floor(Math.random() * 10) - 4);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const textStation = () => {
    // Simulate text integration
    alert('Text KPOP to 95757 to request a song!');
  };

  const shareCurrentSong = () => {
    // Simulate social sharing
    alert(`🎵 Currently listening to "${currentSong.title}" by ${currentSong.artist} on KPOP 95.7 FM! 📻`);
  };

  const createPost = () => {
    if (postContent.trim()) {
      const newPost = {
        id: recentPosts.length + 1,
        content: postContent,
        time: "Just now",
        likes: 0
      };
      setRecentPosts([newPost, ...recentPosts]);
      setPostContent('');
      setShowPostModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg">KPOP 95.7 FM</h1>
              <p className="text-sm text-gray-300">Your Pop Music Station</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Signal className="w-5 h-5 text-green-400" />
            ) : (
              <Signal className="w-5 h-5 text-red-400" />
            )}
            <div className="text-right">
              <p className="text-xs text-gray-300">LIVE</p>
              <p className="text-xs text-gray-300">{listeners.toLocaleString()} listeners</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Current Show Info */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold">SM</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">{currentShow}</h2>
              <p className="text-gray-300">with {currentDJ}</p>
              <p className="text-sm text-gray-400">6:00 AM - 10:00 AM</p>
            </div>
          </div>
        </div>

        {/* Now Playing */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Now Playing</h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm">LIVE</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🎵</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-lg">{currentSong.title}</h4>
              <p className="text-gray-300">{currentSong.artist}</p>
              <p className="text-sm text-gray-400">{currentSong.time}</p>
            </div>
            <button onClick={shareCurrentSong} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all">
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/20 rounded-full h-2 mb-4">
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full" style={{width: '45%'}}></div>
          </div>
        </div>

        {/* Player Controls */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-center space-x-8 mb-6">
            <button
              onClick={toggleMute}
              className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-all"
            >
              <Volume2 className={`w-6 h-6 ${isMuted ? 'text-red-400' : ''}`} />
            </button>
            
            <button
              onClick={togglePlayPause}
              disabled={isLoading}
              className="p-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </button>

            <button className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-all">
              <Heart className="w-6 h-6" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center space-x-4">
            <Volume2 className="w-5 h-5 text-gray-400" />
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-400 w-8">{isMuted ? 0 : volume}</span>
          </div>
        </div>

        {/* Social Media Management */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Station Social Feed</h3>
            <button 
              onClick={() => setShowPostModal(true)}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-lg px-4 py-2 flex items-center space-x-2 transition-all"
            >
              <Edit3 className="w-4 h-4" />
              <span className="text-sm font-semibold">New Post</span>
            </button>
          </div>

          {/* Recent Posts */}
          <div className="space-y-3">
            {recentPosts.slice(0, 3).map((post) => (
              <div key={post.id} className="bg-white/10 rounded-lg p-4">
                <p className="text-sm mb-2">{post.content}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{post.time}</span>
                  <div className="flex items-center space-x-1">
                    <Heart className="w-3 h-3" />
                    <span>{post.likes}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Community Features */}
        <div className="mb-6">
          <button
            onClick={textStation}
            className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl p-4 flex items-center justify-center space-x-2 transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-semibold">Text Song Request</span>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-4">
            <button 
              onClick={() => setShowSchedule(true)}
              className="bg-white/20 hover:bg-white/30 rounded-xl p-4 flex flex-col items-center space-y-2 transition-all"
            >
              <Calendar className="w-6 h-6" />
              <span className="text-sm">Schedule</span>
            </button>
            
            <button className="bg-white/20 hover:bg-white/30 rounded-xl p-4 flex flex-col items-center space-y-2 transition-all">
              <Users className="w-6 h-6" />
              <span className="text-sm">Events</span>
            </button>
            
            <button className="bg-white/20 hover:bg-white/30 rounded-xl p-4 flex flex-col items-center space-y-2 transition-all">
              <Settings className="w-6 h-6" />
              <span className="text-sm">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showSchedule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">📻 KPOP 95.7 FM Schedule</h3>
              <button 
                onClick={() => setShowSchedule(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {schedule.map((slot, index) => (
                <div 
                  key={index} 
                  className={`rounded-lg p-4 ${slot.current ? 'bg-gradient-to-r from-pink-600/20 to-purple-600/20 border border-pink-500/30' : 'bg-white/10'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-bold text-lg">{slot.show}</h4>
                        {slot.current && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                            ON AIR
                          </span>
                        )}
                      </div>
                      <p className="text-pink-300 font-semibold text-sm">with {slot.dj}</p>
                      <p className="text-gray-300 text-sm mt-1">{slot.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm font-mono">{slot.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 bg-white/5 rounded-lg p-4">
              <p className="text-sm text-gray-300 text-center">
                🎵 All times are local. Schedule subject to change for special events and breaking news.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create New Post</h3>
              <button 
                onClick={() => setShowPostModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="What's happening at KPOP 95.7 FM?"
              className="w-full h-32 bg-white/10 rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              maxLength={280}
            />
            
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-400">
                {postContent.length}/280
              </span>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setShowPostModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={createPost}
                  disabled={!postContent.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-lg flex items-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  <span>Post</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      {isPlaying && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-pink-600 to-purple-600 p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">KPOP 95.7 FM - LIVE</p>
                <p className="text-xs opacity-80">{currentSong.title} - {currentSong.artist}</p>
              </div>
            </div>
            <button onClick={togglePlayPause} className="p-2">
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadioStreamingApp;