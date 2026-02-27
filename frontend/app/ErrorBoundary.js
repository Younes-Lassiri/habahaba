// ErrorBoundary.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('❌ Error caught by boundary:', error, errorInfo);
        // You can log to an error tracking service here
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
                    <Text style={styles.errorMessage}>
                        We're working on fixing this issue. Please try again.
                    </Text>
                    <TouchableOpacity 
                        style={styles.retryButton}
                        onPress={this.handleRetry}
                    >
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8f9fa',
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#dc3545',
        marginBottom: 10,
        textAlign: 'center',
    },
    errorMessage: {
        fontSize: 16,
        color: '#6c757d',
        marginBottom: 20,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#007bff',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ErrorBoundary;