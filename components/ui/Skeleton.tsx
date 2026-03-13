import React from 'react';

interface SkeletonProps {
    className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
    return (
        <div className={`animate-pulse bg-white/[0.05] relative overflow-hidden ${className}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shimmer {
                    100% {
                        transform: translateX(100%);
                    }
                }
                `
            }} />
        </div>
    );
};

export default Skeleton;
