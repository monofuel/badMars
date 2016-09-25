// Code generated by protoc-gen-go.
// source: chunk.proto
// DO NOT EDIT!

/*
Package chunk is a generated protocol buffer package.

It is generated from these files:
	chunk.proto

It has these top-level messages:
	ChunkLoc
	IntRow
	FloatRow
	Unit
	Chunk
*/
package chunk

import proto "github.com/golang/protobuf/proto"
import fmt "fmt"
import math "math"

import (
	context "golang.org/x/net/context"
	grpc "google.golang.org/grpc"
)

// Reference imports to suppress errors if they are not otherwise used.
var _ = proto.Marshal
var _ = fmt.Errorf
var _ = math.Inf

// This is a compile-time assertion to ensure that this generated file
// is compatible with the proto package it is being compiled against.
// A compilation error at this line likely means your copy of the
// proto package needs to be updated.
const _ = proto.ProtoPackageIsVersion2 // please upgrade the proto package

type ChunkLoc struct {
	MapName string `protobuf:"bytes,1,opt,name=mapName" json:"mapName,omitempty"`
	X       int32  `protobuf:"varint,2,opt,name=x" json:"x,omitempty"`
	Y       int32  `protobuf:"varint,3,opt,name=y" json:"y,omitempty"`
}

func (m *ChunkLoc) Reset()                    { *m = ChunkLoc{} }
func (m *ChunkLoc) String() string            { return proto.CompactTextString(m) }
func (*ChunkLoc) ProtoMessage()               {}
func (*ChunkLoc) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{0} }

type IntRow struct {
	Items []int32 `protobuf:"varint,1,rep,packed,name=items" json:"items,omitempty"`
}

func (m *IntRow) Reset()                    { *m = IntRow{} }
func (m *IntRow) String() string            { return proto.CompactTextString(m) }
func (*IntRow) ProtoMessage()               {}
func (*IntRow) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{1} }

type FloatRow struct {
	Items []float32 `protobuf:"fixed32,1,rep,packed,name=items" json:"items,omitempty"`
}

func (m *FloatRow) Reset()                    { *m = FloatRow{} }
func (m *FloatRow) String() string            { return proto.CompactTextString(m) }
func (*FloatRow) ProtoMessage()               {}
func (*FloatRow) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{2} }

type Unit struct {
	Uuid     string `protobuf:"bytes,1,opt,name=uuid" json:"uuid,omitempty"`
	TileHash string `protobuf:"bytes,2,opt,name=tileHash" json:"tileHash,omitempty"`
}

func (m *Unit) Reset()                    { *m = Unit{} }
func (m *Unit) String() string            { return proto.CompactTextString(m) }
func (*Unit) ProtoMessage()               {}
func (*Unit) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{3} }

type Chunk struct {
	Hash      string      `protobuf:"bytes,1,opt,name=hash" json:"hash,omitempty"`
	Map       string      `protobuf:"bytes,2,opt,name=map" json:"map,omitempty"`
	X         int32       `protobuf:"varint,3,opt,name=x" json:"x,omitempty"`
	Y         int32       `protobuf:"varint,4,opt,name=y" json:"y,omitempty"`
	NavGrid   []*IntRow   `protobuf:"bytes,5,rep,name=navGrid" json:"navGrid,omitempty"`
	Grid      []*FloatRow `protobuf:"bytes,6,rep,name=grid" json:"grid,omitempty"`
	ChunkSize int32       `protobuf:"varint,7,opt,name=chunkSize" json:"chunkSize,omitempty"`
	Units     []*Unit     `protobuf:"bytes,8,rep,name=units" json:"units,omitempty"`
}

func (m *Chunk) Reset()                    { *m = Chunk{} }
func (m *Chunk) String() string            { return proto.CompactTextString(m) }
func (*Chunk) ProtoMessage()               {}
func (*Chunk) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{4} }

func (m *Chunk) GetNavGrid() []*IntRow {
	if m != nil {
		return m.NavGrid
	}
	return nil
}

func (m *Chunk) GetGrid() []*FloatRow {
	if m != nil {
		return m.Grid
	}
	return nil
}

func (m *Chunk) GetUnits() []*Unit {
	if m != nil {
		return m.Units
	}
	return nil
}

func init() {
	proto.RegisterType((*ChunkLoc)(nil), "chunk.ChunkLoc")
	proto.RegisterType((*IntRow)(nil), "chunk.IntRow")
	proto.RegisterType((*FloatRow)(nil), "chunk.FloatRow")
	proto.RegisterType((*Unit)(nil), "chunk.Unit")
	proto.RegisterType((*Chunk)(nil), "chunk.Chunk")
}

// Reference imports to suppress errors if they are not otherwise used.
var _ context.Context
var _ grpc.ClientConn

// This is a compile-time assertion to ensure that this generated file
// is compatible with the grpc package it is being compiled against.
const _ = grpc.SupportPackageIsVersion3

// Client API for Map service

type MapClient interface {
	GetChunk(ctx context.Context, in *ChunkLoc, opts ...grpc.CallOption) (*Chunk, error)
}

type mapClient struct {
	cc *grpc.ClientConn
}

func NewMapClient(cc *grpc.ClientConn) MapClient {
	return &mapClient{cc}
}

func (c *mapClient) GetChunk(ctx context.Context, in *ChunkLoc, opts ...grpc.CallOption) (*Chunk, error) {
	out := new(Chunk)
	err := grpc.Invoke(ctx, "/chunk.Map/getChunk", in, out, c.cc, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

// Server API for Map service

type MapServer interface {
	GetChunk(context.Context, *ChunkLoc) (*Chunk, error)
}

func RegisterMapServer(s *grpc.Server, srv MapServer) {
	s.RegisterService(&_Map_serviceDesc, srv)
}

func _Map_GetChunk_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(ChunkLoc)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(MapServer).GetChunk(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/chunk.Map/GetChunk",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(MapServer).GetChunk(ctx, req.(*ChunkLoc))
	}
	return interceptor(ctx, in, info, handler)
}

var _Map_serviceDesc = grpc.ServiceDesc{
	ServiceName: "chunk.Map",
	HandlerType: (*MapServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "getChunk",
			Handler:    _Map_GetChunk_Handler,
		},
	},
	Streams:  []grpc.StreamDesc{},
	Metadata: fileDescriptor0,
}

func init() { proto.RegisterFile("chunk.proto", fileDescriptor0) }

var fileDescriptor0 = []byte{
	// 304 bytes of a gzipped FileDescriptorProto
	0x1f, 0x8b, 0x08, 0x00, 0x00, 0x09, 0x6e, 0x88, 0x02, 0xff, 0x64, 0x51, 0xc9, 0x4a, 0x03, 0x41,
	0x10, 0xb5, 0xd3, 0xd3, 0xc9, 0xa4, 0x12, 0x51, 0x0a, 0x0f, 0x4d, 0x10, 0x19, 0xc7, 0x83, 0x03,
	0x42, 0x0e, 0x11, 0x3c, 0x0b, 0x82, 0x0b, 0xa8, 0x87, 0x16, 0x3f, 0xa0, 0x4d, 0x86, 0x4c, 0x63,
	0x66, 0x21, 0xd3, 0xa3, 0x89, 0x5f, 0xea, 0xe7, 0x48, 0x6f, 0x2e, 0x78, 0x7b, 0xaf, 0xea, 0xd5,
	0xf2, 0xaa, 0x60, 0x34, 0x2f, 0xba, 0xea, 0x75, 0xda, 0xac, 0x6b, 0x5d, 0x23, 0xb3, 0x24, 0xbd,
	0x84, 0xf8, 0xca, 0x80, 0xfb, 0x7a, 0x8e, 0x1c, 0x06, 0xa5, 0x6c, 0x1e, 0x65, 0x99, 0x73, 0x92,
	0x90, 0x6c, 0x28, 0x02, 0xc5, 0x31, 0x90, 0x0d, 0xef, 0x25, 0x24, 0x63, 0x82, 0x6c, 0x0c, 0xdb,
	0x72, 0xea, 0xd8, 0x36, 0x3d, 0x82, 0xfe, 0x5d, 0xa5, 0x45, 0xfd, 0x8e, 0x07, 0xc0, 0x94, 0xce,
	0xcb, 0x96, 0x93, 0x84, 0x66, 0x4c, 0x38, 0x92, 0x26, 0x10, 0x5f, 0xaf, 0x6a, 0xf9, 0x5f, 0xd1,
	0x0b, 0x8a, 0x0b, 0x88, 0x9e, 0x2b, 0xa5, 0x11, 0x21, 0xea, 0x3a, 0xb5, 0xf0, 0xc3, 0x2d, 0xc6,
	0x09, 0xc4, 0x5a, 0xad, 0xf2, 0x5b, 0xd9, 0x16, 0x76, 0x81, 0xa1, 0xf8, 0xe6, 0xe9, 0x27, 0x01,
	0x66, 0x97, 0x37, 0x95, 0x85, 0x51, 0xf8, 0x4a, 0x83, 0x71, 0x1f, 0x68, 0x29, 0x1b, 0x5f, 0x64,
	0xa0, 0x73, 0x41, 0xff, 0xb8, 0x88, 0xbc, 0x0b, 0x3c, 0x85, 0x41, 0x25, 0xdf, 0x6e, 0xd6, 0x6a,
	0xc1, 0x59, 0x42, 0xb3, 0xd1, 0x6c, 0x77, 0xea, 0xae, 0xe5, 0xbc, 0x89, 0x90, 0xc5, 0x13, 0x88,
	0x96, 0x46, 0xd5, 0xb7, 0xaa, 0x3d, 0xaf, 0x0a, 0x0e, 0x85, 0x4d, 0xe2, 0x21, 0x0c, 0x6d, 0xfc,
	0x49, 0x7d, 0xe4, 0x7c, 0x60, 0x67, 0xfc, 0x04, 0xf0, 0x18, 0x58, 0x57, 0x29, 0xdd, 0xf2, 0xd8,
	0xf6, 0x18, 0xf9, 0x1e, 0xe6, 0x06, 0xc2, 0x65, 0x66, 0x33, 0xa0, 0x0f, 0xb2, 0xc1, 0x33, 0x88,
	0x97, 0xb9, 0x76, 0x1e, 0xc3, 0xa8, 0xf0, 0xae, 0xc9, 0xf8, 0x77, 0x20, 0xdd, 0x79, 0xe9, 0xdb,
	0xc7, 0x9e, 0x7f, 0x05, 0x00, 0x00, 0xff, 0xff, 0xf2, 0x4e, 0x99, 0xd8, 0xe7, 0x01, 0x00, 0x00,
}
