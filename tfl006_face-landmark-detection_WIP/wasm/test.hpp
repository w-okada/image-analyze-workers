

class MemoryUtil
{
private:
public:
    MemoryUtil();
    ~MemoryUtil();
    unsigned char *inputImageBuffer;
    void init(int width, int height, int channel);
    unsigned char *getInputImageBufferAddress();
};