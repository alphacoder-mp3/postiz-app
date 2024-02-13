"use client";
import {FC, useEffect, useMemo, useRef} from "react";
import DrawChart from 'chart.js/auto';
import {StarsList} from "@gitroom/frontend/components/analytics/stars.and.forks.interface";
import dayjs from "dayjs";

export const Chart: FC<{list: StarsList[]}> = (props) => {
    const {list} = props;
    const ref = useRef<any>(null);
    const chart = useRef<null | DrawChart>(null);
    useEffect(() => {
        const gradient = ref.current.getContext('2d').createLinearGradient(0, 0, 0, ref.current.height);
        gradient.addColorStop(0, 'rgba(114, 118, 137, 1)'); // Start color with some transparency
        gradient.addColorStop(1, 'rgb(9, 11, 19, 1)');
        chart.current = new DrawChart(
            ref.current!,
            {
                type: 'line',
                options: {
                    maintainAspectRatio: false,
                    responsive: true,
                    layout: {
                        padding: {
                            left: 0,
                            right: 0,
                            top: 0,
                            bottom: 0
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            display: false
                        },
                        x: {
                            display: false
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                    }
                },
                data: {
                    labels: list.map(row => dayjs(row.date).format('DD/MM/YYYY')),
                    datasets: [
                        {
                            borderColor: '#fff',
                            label: 'Stars by date',
                            backgroundColor: gradient,
                            fill: true,
                            data: list.map(row => row.totalStars)
                        }
                    ]
                }
            }
        );
        return () => {
            chart?.current?.destroy();
        }
    }, []);
    return <canvas className="w-full h-full" ref={ref} />
}