'use client';

import { useEffect } from 'react';

interface PerformanceMonitorProps {
  pageName: string;
}

export default function PerformanceMonitor({ pageName }: PerformanceMonitorProps) {
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        // Log long tasks that might cause hangs
        if (entry.entryType === 'longtask') {
          console.warn(`[${pageName}] Long task detected:`, {
            duration: entry.duration,
            startTime: entry.startTime,
          });
        }
        
        // Log layout shifts
        if (entry.entryType === 'layout-shift') {
          const layoutShift = entry as any;
          if (layoutShift.value > 0.1) {
            console.warn(`[${pageName}] Layout shift detected:`, {
              value: layoutShift.value,
              sources: layoutShift.sources?.map((s: any) => s.node),
            });
          }
        }
        
        // Log large contentful paint
        if (entry.entryType === 'largest-contentful-paint') {
          console.log(`[${pageName}] LCP:`, entry.startTime);
        }
      });
    });

    // Observe performance metrics
    try {
      observer.observe({ entryTypes: ['longtask', 'layout-shift', 'largest-contentful-paint'] });
    } catch (error) {
      console.log('Performance observer not supported');
    }

    // Monitor memory usage on mobile
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = {
          used: Math.round(memory.usedJSHeapSize / 1048576),
          total: Math.round(memory.totalJSHeapSize / 1048576),
          limit: Math.round(memory.jsHeapSizeLimit / 1048576),
        };
        
        // Warn if memory usage is high
        if (memoryUsage.used > 50) {
          console.warn(`[${pageName}] High memory usage:`, memoryUsage);
        }
      }
    };

    // Check memory every 10 seconds
    const memoryInterval = setInterval(checkMemory, 10000);
    
    // Initial check
    checkMemory();

    return () => {
      observer.disconnect();
      clearInterval(memoryInterval);
    };
  }, [pageName]);

  return null; // This component doesn't render anything
}