import { useState } from 'react';
import { Search, Filter, Play, MoreVertical, Clock, Users } from 'lucide-react';
import { Button, Input, Card, Badge } from '../components/ui';
import { formatRelativeTime, formatDuration } from '../utils/helpers';

// Mock data
const mockTracks = [
  {
    id: 1,
    title: 'Summer Vibes Collab',
    genre: 'Lo-Fi',
    contributors: 12,
    duration: 234,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'completed',
  },
  {
    id: 2,
    title: 'Midnight Drive',
    genre: 'Synthwave',
    contributors: 8,
    duration: 186,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: 'completed',
  },
  {
    id: 3,
    title: 'Jazz Fusion Experiment',
    genre: 'Jazz',
    contributors: 5,
    duration: 312,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    status: 'in_progress',
  },
  {
    id: 4,
    title: 'Electronic Dreams',
    genre: 'Electronic',
    contributors: 23,
    duration: 198,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    status: 'completed',
  },
];

const genres = ['All', 'Lo-Fi', 'Electronic', 'Rock', 'Jazz', 'Hip Hop', 'Synthwave'];

const Library = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');

  const filteredTracks = mockTracks.filter((track) => {
    const matchesSearch = track.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === 'All' || track.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  return (
    <div className="container-app py-6 lg:py-8">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Library</h1>
        <p className="text-gray-600 mt-1">Browse and discover collaborative tracks</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search tracks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {genres.map((genre) => (
            <Button
              key={genre}
              variant={selectedGenre === genre ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedGenre(genre)}
              className="whitespace-nowrap"
            >
              {genre}
            </Button>
          ))}
        </div>
      </div>

      {/* Tracks Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTracks.map((track) => (
          <Card key={track.id} hover padding="none" className="overflow-hidden">
            {/* Track artwork placeholder */}
            <div className="aspect-video bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center relative group">
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 text-primary-600 ml-1" />
              </div>
              <Badge 
                variant={track.status === 'completed' ? 'success' : 'primary'}
                className="absolute top-3 right-3"
              >
                {track.status === 'completed' ? 'Completed' : 'In Progress'}
              </Badge>
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{track.title}</h3>
                  <p className="text-sm text-gray-500">{track.genre}</p>
                </div>
                <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {track.contributors} contributors
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDuration(track.duration)}
                </span>
              </div>

              <p className="mt-2 text-xs text-gray-400">
                {formatRelativeTime(track.createdAt)}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {filteredTracks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No tracks found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default Library;
