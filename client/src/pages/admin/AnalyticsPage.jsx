import React from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/button';
import { BarChart2, Users, Clock, Activity } from 'lucide-react';

const AnalyticsPage = () => {
  // Mock data - replace with real data from your API
  const stats = [
    { title: 'Total Users', value: '1,234', icon: Users, change: '+12% from last month' },
    { title: 'Active Sessions', value: '42', icon: Activity, change: '+5% from last week' },
    { title: 'Avg. Session', value: '12m 34s', icon: Clock, change: '-2% from last week' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <div className="flex space-x-2">
          <Button variant="outline">Last 7 days</Button>
          <Button>Export</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => (
          <Card key={index} className="p-4">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-sm font-medium">
                {stat.title}
              </h3>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Chart */}
      <Card className="col-span-2 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">User Activity</h2>
        </div>
        <div className="h-[400px] flex items-center justify-center bg-muted/50 rounded-lg p-4">
          <div className="text-center space-y-2">
            <BarChart2 className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Analytics chart will be displayed here
            </p>
            <p className="text-xs text-muted-foreground">
              Connect your analytics service to view real data
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
